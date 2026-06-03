import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app";
import { attachChatServer } from "./lib/chat-ws";

const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "0.0.0.0";

const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`[backend] listening on http://${hostname}:${info.port}`);
  console.log(`[backend] try: curl http://localhost:${info.port}/api/health`);
});

attachChatServer(server);
