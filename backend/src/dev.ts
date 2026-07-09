import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app";
import { attachChatServer } from "./lib/chat-ws";
import { logStreamConfig } from "./routes/watch";
import { warnIfEbarimtPlaceholders } from "./lib/ebarimt";

const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "0.0.0.0";

logStreamConfig();
warnIfEbarimtPlaceholders();

const server = serve({ fetch: app.fetch, port, hostname }, (_info) => {});

attachChatServer(server);
