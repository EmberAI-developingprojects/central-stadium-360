import { Hono } from "hono";
import type { DbEvent } from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";

const events = new Hono();

events.get("/", async (c) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      "id,title,description,status,start_time,price,image,featured,created_at",
    )
    .order("start_time", { ascending: true });

  if (error) {
    console.error("[events] select failed:", error);
    return c.json({ ok: false, error: error.message } as const, 500);
  }

  return c.json({ ok: true, data: (data ?? []) as DbEvent[] } as const);
});

export default events;
