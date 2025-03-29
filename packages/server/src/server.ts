import express from "express";
import http, { IncomingMessage } from "http";
import { type WebSocket, WebSocketServer, type RawData } from "ws";
import { v4 as uuidv4 } from "uuid";
import type { ClientInfo } from "./types/client-info.js";
import { logger, safeParseParams, type Message, type Slug } from "@mikkel-ol/shared";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Map<Slug, ClientInfo>();

function handleNewTunnel(ws: WebSocket, req: IncomingMessage) {
  // https://subdomain.tunnel.dev?pleasegivemea=tunnel&token=apikey&type=mf&port=1234&subdomain=mytunnel
  const searchParams = new URLSearchParams((req.url || "").split("?")[1]);

  const result = safeParseParams(searchParams);

  if (!result.success) {
    ws.close(1003, `Invalid parameters: ${JSON.stringify(result.error.format())}`);
    return;
  }

  const { port, token: apiKey, subdomain, type } = result.data;

  if (!apiKey) {
    return ws.close(1003, "Invalid API key");
  }

  // TODO: Validate apikey
  const validApiKey = true;
  if (!validApiKey) {
    return ws.close(1003, "Invalid API key");
  }

  const slug = subdomain || "vast-ice"; //subdomain || generateSlug(2);

  const doesSlugExist = !!clients.get(slug);

  if (doesSlugExist) {
    return ws.close(1003, `Subdomain already in use: ${slug}`);
  }

  const client: ClientInfo = {
    ws,
    port,
    type,
    slug,
  };

  clients.set(slug, client);

  ws.on("message", (data) => {
    const message: Message = JSON.parse(data.toString());
    logger.debug(`Incoming message on ${client.slug}`, message);

    if (type === "mf" && message.type === "reload") {
      clients.forEach((client) => {
        if (client.type === "host") {
          client.ws.send(JSON.stringify(message));
        }
      });
    }
  });

  ws.on("close", () => {
    clients.delete(slug);
  });

  const message: Message = {
    type: "tunnel-ready",
    timestamp: Date.now(),
    url: `https://${slug}.${process.env.DOMAIN}`,
  };

  ws.send(JSON.stringify(message));
}

function handleProxySocket(ws: WebSocket, req: IncomingMessage) {
  const slug = req.headers.host?.split(".")[0];

  if (!slug) {
    return ws.close(1003, `Unknown tunnel: ${req.headers.host}`);
  }

  const client = clients.get(slug);

  if (!client) {
    return ws.close(1003, `Unknown tunnel: ${slug}`);
  }

  const proxy = client.ws;

  proxy.on("message", (data) => {
    const message: Message = JSON.parse(data.toString());

    if (message.type === "socket-proxy-close") {
      ws.close(message.code, message.reason);
    }

    if (message.type === "socket-proxy-error") {
      ws.close(1003, message.error.message);
    }

    if (message.type === "socket-proxy-message") {
      ws.send(message.data);
    }
  });

  ws.on("message", (data) => {
    const message: Message = {
      type: "socket-proxy-message",
      timestamp: Date.now(),
      data: data.toString(),
    };

    proxy.send(JSON.stringify(message));
  });

  const message: Message = {
    type: "socket-proxy-open",
    timestamp: Date.now(),
    headers: req.headers,
    protocol: ws.protocol,
  };

  proxy.send(JSON.stringify(message));
}

// 1. Incoming WebSocket connections from clients
wss.on("connection", (ws, req) => {
  logger.debug("Incoming WebSocket connection", req.url, req.socket.remoteAddress);

  // https://subdomain.tunnel.dev?pleasegivemea=tunnel&token=apikey&type=mf&port=1234&subdomain=mytunnel
  const searchParams = new URLSearchParams((req.url || "").split("?")[1]);

  const pleaseGiveMeA = searchParams.get("pleasegivemea");

  if (pleaseGiveMeA === "tunnel") {
    return handleNewTunnel(ws, req);
  }

  return handleProxySocket(ws, req);
});

// 2. Handle incoming HTTP requests and forward over WebSocket to client
app.use((req, res) => {
  const host = req.headers.host;

  if (!host) {
    res.json("No host found").status(400);
    return;
  }

  const slug = host.split(".")[0];

  if (!slug) {
    res.json({ error: `Unknown tunnel: ${host}` }).status(400);
    return;
  }

  const client = clients.get(slug);

  if (!client) {
    res.json({ error: `Unknown tunnel: ${host}` }).status(400);
    return;
  }

  logger.debug(`${req.method} ${slug}: ${req.url}`, req.socket.remoteAddress);

  const ws = client.ws;

  const chunks: Buffer[] = [];
  req.on("data", (chunk) => chunks.push(chunk));

  req.on("end", () => {
    const requestId = uuidv4();
    const body = Buffer.concat(chunks).toString("base64");

    const onMessage = (msg: RawData) => {
      const response = JSON.parse(msg.toString()) as Message;

      if (response.type === "http-response" && response.requestId === requestId) {
        ws.off("message", onMessage);
        res.writeHead(response.status ?? 0, response.headers);
        res.end(Buffer.from(response.body, "base64"));
      }
    };

    ws.on("message", onMessage);

    const payload: Message = {
      type: "http-request",
      timestamp: Date.now(),
      requestId,
      method: req.method,
      url: req.url,
      headers: req.headers,
      body,
    };

    ws.send(JSON.stringify(payload));
  });
});

server.listen(process.env.PORT);

server.on("listening", () => {
  logger.success(`Server running on port ${process.env.PORT}`);
});
