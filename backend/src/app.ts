import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { HealthResponse } from "@cs360/shared";
import events from "./routes/events";
import auth from "./routes/auth";
import tickets from "./routes/tickets";
import payments from "./routes/payments";
import kiosk from "./routes/kiosk";
import adminKiosk from "./routes/admin-kiosk";
import smsHook from "./routes/sms-hook";
import emailHook from "./routes/email-hook";
import adminEvents from "./routes/admin-events";
import adminContent, { publicContent } from "./routes/admin-content";
import adminHistory, { publicHistory } from "./routes/history";
import adminUsers from "./routes/admin-users";
import adminUploads from "./routes/admin-uploads";
import adminTickets from "./routes/admin-tickets";
import adminRecordings from "./routes/admin-recordings";
import recordings from "./routes/recordings";
import watch from "./routes/watch";

const startedAt = Date.now();

export const app = new Hono().basePath("/api");

const requestLogger = logger();
app.use("*", async (c, next) => {
  if (c.req.path === "/api/health") return next();
  return requestLogger(c, next);
});
app.use("*", compress());

const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ALLOWED_ORIGINS?.split(",") ?? []),
    ...(process.env.NODE_ENV === "production" ? [] : DEV_ORIGINS),
  ]
    .map((o) => o?.trim().replace(/\/$/, ""))
    .filter((o): o is string => Boolean(o)),
);

app.use(
  "*",
  cors({
    origin: (origin) => (allowedOrigins.has(origin) ? origin : null),
    credentials: true,
  }),
);

app.route("/events", events);
app.route("/auth", auth);
app.route("/tickets", tickets);
app.route("/payments", payments);
app.route("/kiosk", kiosk);
app.route("/internal", smsHook);
app.route("/internal", emailHook);
app.route("/admin/events", adminEvents);
app.route("/admin/content", adminContent);
app.route("/admin/users", adminUsers);
app.route("/admin/uploads", adminUploads);
app.route("/admin/tickets", adminTickets);
app.route("/admin/recordings", adminRecordings);
app.route("/admin/kiosk", adminKiosk);
app.route("/recordings", recordings);
app.route("/content", publicContent);
app.route("/history", publicHistory);
app.route("/admin/history", adminHistory);
app.route("/watch", watch);

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
  console.error(
    "[onError]",
    c.req.method,
    c.req.path,
    err instanceof Error ? err.stack ?? err.message : err,
  );
  return c.json({ ok: false, error: "internal_error" }, 500);
});

export default app;
