import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import httpProxy from "http-proxy";
import { v4 as uuidv4 } from "uuid";
import type { ClientInfo } from "@mikkel-ol/shared";
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
import { generateSlug } from "random-word-slugs";

const proxy = httpProxy.createProxyServer();

const clients = new Map<string, ClientInfo>(); // token -> client info
const listeners = new Set<WebSocket>(); // connected 'host' clients

app.use(express.json());

// 1. Endpoint to request a tunnel
app.post("/request-tunnel", (req, res) => {
  const { port, type = "mf" } = req.body;
  const token = uuidv4();
  const slug = generateSlug(2);
  const url = `${token}.mytunnel.dev`;
  res.json({ token, url });
});

// 2. Incoming WebSocket connections from clients
wss.on("connection", (ws, req) => {
  const params = new URLSearchParams((req.url || "").split("?")[1]);
  const token = params.get("token");
  const port = parseInt(params.get("port") || "0");
  const type = (params.get("type") || "mf") as "host" | "mf";

  if (!token || !port) return ws.close();

  clients.set(token, { ws, port, type });
  if (type === "host") listeners.add(ws);

  ws.on("message", (data) => {
    // Forward event to all 'host' clients
    if (type === "mf") {
      for (const listener of listeners) {
        if (listener.readyState === WebSocket.OPEN) {
          listener.send(data);
        }
      }
    }
  });

  ws.on("close", () => {
    clients.delete(token);
    if (type === "host") listeners.delete(ws);
  });
});

// 3. Proxy HTTP traffic to tunnel clients
app.use((req, res) => {
  const host = req.headers.host || "";
  const token = host.split(".")[0];
  const client = clients.get(token!);

  if (!client || client.type !== "mf") {
    res.sendStatus(502);
    return;
  }

  proxy.web(req, res, { target: `http://localhost:${client.port}` }, () => {
    res.sendStatus(502);
  });
});

server.listen(443);
