import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import { WebSocketServer, WebSocket } from "ws";

const CHAT_PATH = "/api/chat";

type UpgradeListener = (
  req: IncomingMessage,
  socket: Socket,
  head: Buffer,
) => void;

interface UpgradableServer {
  on(event: "upgrade", listener: UpgradeListener): unknown;
}

type Incoming = {
  name?: unknown;
  color?: unknown;
  text?: unknown;
  clientId?: unknown;
};

type Broadcast = {
  type: "msg";
  id: string;
  name: string;
  color: string;
  text: string;
  clientId: string;
  ts: number;
};

const trim = (v: unknown, max: number): string => {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
};

export function attachChatServer(httpServer: UpgradableServer): void {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    const url = req.url ?? "";
    if (!url.startsWith(CHAT_PATH)) {
      return; // let other handlers / default 404 take it
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    ws.on("message", (data) => {
      let parsed: Incoming;
      try {
        parsed = JSON.parse(data.toString()) as Incoming;
      } catch {
        return;
      }
      const name = trim(parsed.name, 40) || "Зочин";
      const text = trim(parsed.text, 200);
      const color = trim(parsed.color, 16) || "#4451DC";
      const clientId = trim(parsed.clientId, 32);
      if (!text) return;

      const payload: Broadcast = {
        type: "msg",
        id: Math.random().toString(36).slice(2, 11),
        name,
        color,
        text,
        clientId,
        ts: Date.now(),
      };
      const json = JSON.stringify(payload);

      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(json);
        }
      }
    });
  });

  // Periodic ping to keep connections alive through proxies.
  const interval = setInterval(() => {
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.ping();
        } catch {
          /* ignore */
        }
      }
    }
  }, 25_000);

  wss.on("close", () => clearInterval(interval));

  console.log(`[chat-ws] attached at ws://…${CHAT_PATH}`);
}
