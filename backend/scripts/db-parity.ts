// Read-only parity check: runs the same query shapes through supabase-js
// (against Supabase) and through lib/db.ts (against Cloud SQL) and diffs the
// JSON. Used while moving off Supabase; needs SUPABASE_URL,
// SUPABASE_SERVICE_KEY and DATABASE_URL.
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { getDb } from "../src/lib/db";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket as never },
});
const db = getDb()!;

type Client = { from(t: string): any };
const now = new Date().toISOString();

const cases: Record<string, (c: Client) => PromiseLike<any>> = {
  "events + recordings(count), not null, desc": (c) =>
    c.from("events").select("id,title,start_time,live_price,replay_price,live_end_at,recordings(count)")
      .not("live_end_at", "is", null).order("start_time", { ascending: false }),
  "events + zones embed": (c) =>
    c.from("events").select("id,title,status,start_time,zones(id,name_mn,price,capacity,sold,sort_order)")
      .in("status", ["upcoming", "live", "ended"]).order("start_time", { ascending: true }),
  "venue_orders + events:events + venue_tickets(count)": (c) =>
    c.from("venue_orders").select("*,events:events(title),venue_tickets(count)")
      .order("created_at", { ascending: false }).limit(25),
  "venue_tickets + zones, count exact + range": (c) =>
    c.from("venue_tickets").select("code,used_at,zone_id,zones(name_mn,event_id)", { count: "exact" })
      .not("used_at", "is", null).order("used_at", { ascending: false }).range(0, 9),
  "venue_tickets ilike": (c) =>
    c.from("venue_tickets").select("id,code").ilike("code", "%a%").order("id"),
  "tickets + users:users + events:events": (c) =>
    c.from("tickets").select("id,status,price,tier,created_at,paid_at,users:users(email,phone,full_name),events:events(title)")
      .order("created_at", { ascending: false }),
  "tickets double or()": (c) =>
    c.from("tickets").select("id,ticket_type,tier,access_expires_at")
      .eq("status", "paid")
      .or(`access_expires_at.is.null,access_expires_at.gt.${now}`)
      .or("ticket_type.eq.replay,tier.eq.multi5").order("id"),
  "tickets order nullsFirst:false": (c) =>
    c.from("tickets").select("id,max_devices").order("max_devices", { ascending: false, nullsFirst: false }).order("id"),
  "users count head": (c) =>
    c.from("users").select("id", { count: "exact", head: true }).eq("role", "admin").is("deleted_at", null),
  "home_news *": (c) => c.from("home_news").select("*").order("sort_order", { ascending: true }),
  "recordings *": (c) => c.from("recordings").select("*").order("created_at"),
  "zones maybeSingle (one row)": (c) => c.from("zones").select("*").order("id").limit(1).maybeSingle(),
  "users maybeSingle (many rows → error)": (c) => c.from("users").select("id").eq("role", "user").maybeSingle(),
  "events maybeSingle (no row)": (c) =>
    c.from("events").select("id").eq("id", "00000000-0000-0000-0000-000000000000").maybeSingle(),
  "missing column error": (c) => c.from("events").select("id,not_a_column"),
};

function norm(r: any) {
  return JSON.stringify({
    data: r.data,
    count: r.count ?? null,
    error: r.error ? { code: r.error.code } : null,
  });
}

let failed = 0;
for (const [name, build] of Object.entries(cases)) {
  const [a, b] = await Promise.all([build(sb), build(db)]);
  const same = norm(a) === norm(b);
  if (!same) failed++;
  console.log(`${same ? "OK  " : "DIFF"} ${name}`);
  if (!same) {
    const x = norm(a);
    const y = norm(b);
    let i = 0;
    while (i < x.length && x[i] === y[i]) i++;
    const from = Math.max(0, i - 120);
    console.log(`  first difference at char ${i}`);
    console.log("  supabase: …" + x.slice(from, i + 200));
    console.log("  cloudsql: …" + y.slice(from, i + 200));
  }
}
console.log(failed ? `\n${failed} case(s) differ` : "\nall cases match");
await db.pool.end();
process.exit(failed ? 1 : 0);
