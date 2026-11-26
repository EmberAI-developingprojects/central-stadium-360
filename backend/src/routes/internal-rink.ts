import { Hono } from "hono";
import { expireStaleRinkTickets, sendRinkReminders } from "../lib/rink";
import { requireInternalSecret } from "./internal-recordings";

// Cloud Scheduler calls /tick every minute: SMS reminders ~10 minutes before a
// rink session ends, and freeing the pairs of tickets never scanned on the day.
const internalRink = new Hono();

internalRink.use("*", requireInternalSecret);

internalRink.post("/tick", async (c) => {
  const expired = await expireStaleRinkTickets();
  const reminders = await sendRinkReminders();
  return c.json({ ok: true, data: { expired, ...reminders } } as const);
});

export default internalRink;
