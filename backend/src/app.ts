import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { HealthResponse } from "@cs360/shared";
import events from "./routes/events";
import auth from "./routes/auth";
import tickets from "./routes/tickets";
import payments from "./routes/payments";
import smsHook from "./routes/sms-hook";
import adminEvents from "./routes/admin-events";
import adminContent, { publicContent } from "./routes/admin-content";
import adminUsers from "./routes/admin-users";
import adminUploads from "./routes/admin-uploads";

const startedAt = Date.now();

export const app = new Hono().basePath("/api");

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    credentials: true,
  }),
);

app.route("/events", events);
app.route("/auth", auth);
app.route("/tickets", tickets);
app.route("/payments", payments);
app.route("/internal", smsHook);
app.route("/admin/events", adminEvents);
app.route("/admin/content", adminContent);
app.route("/admin/users", adminUsers);
app.route("/admin/uploads", adminUploads);
app.route("/content", publicContent);

app.get("/health", (c) => {
  const payload: HealthResponse = {
    status: "ok",
    service: "central-stadium-360-backend",
    uptime: Math.floor((Date.now() - startedAt) / 1000),
  };
  return c.json(payload);
});

app.notFound((c) => c.json({ ok: false, error: "not_found" }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ ok: false, error: "internal_error" }, 500);
});

export default app;
