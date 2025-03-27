import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import httpProxy from "http-proxy";
import { TUNNEL_ENDPOINT, type ClientInfo, type TunnelRequest, type TunnelResponse } from "@mikkel-ol/shared";
import { generateSlug } from "random-word-slugs";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const proxy = httpProxy.createProxyServer();

const clients = new Map<string, ClientInfo>(); // slug -> client info
const listeners = new Set<WebSocket>(); // connected 'host' clients

app.use(express.json());

// 1. Endpoint to request a tunnel
app.post<{}, TunnelResponse, TunnelRequest>(TUNNEL_ENDPOINT, (req, res) => {
  const { port, type = "mf" } = req.body;
  const slug = generateSlug(2);
  const url = `https://${slug}.${process.env.DOMAIN}`;

  // ? should we establish the tunnel here?

  res.json({ slug, url });
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

server.listen(process.env.PORT);
