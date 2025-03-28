import express from "express";
import http from "http";
import { WebSocketServer, type RawData } from "ws";
import { generateSlug } from "random-word-slugs";
import { v4 as uuidv4 } from "uuid";
import type { ClientInfo } from "./types/client-info.js";
import { Params, type Message, type Slug } from "@mikkel-ol/shared";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Map<Slug, ClientInfo>();

// 1. Incoming WebSocket connections from clients
wss.on("connection", (ws, req) => {
  // https://subdomain.tunnel.dev?token=apikey&type=mf&port=1234&subdomain=mytunnel
  const searchParams = new URLSearchParams((req.url || "").split("?")[1]);
  const result = Params.safeParse(searchParams);

  if (!result.success) {
    ws.close(1003, `Invalid parameters: ${result.error.format()}`);
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

  const slug = subdomain || generateSlug(2);

  const doesSlugExist = !!clients.get(slug);

  if (doesSlugExist) {
    return ws.close(1003, `Subdomain already in use: ${slug}`);
  }

  clients.set(slug, { ws, port, type: type! });

  ws.on("message", (data) => {
    const message: Message = JSON.parse(data.toString());

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
    res.json(`Unknown tunnel: ${host}`).status(400);
    return;
  }

  const client = clients.get(slug);

  if (!client) {
    res.json(`Unknown tunnel: ${host}`).status(400);
    return;
  }

  const ws = client.ws;

  const chunks: Buffer[] = [];
  req.on("data", (chunk) => chunks.push(chunk));

  req.on("end", () => {
    const requestId = uuidv4();
    const body = Buffer.concat(chunks).toString("base64");

    const onMessage = (msg: RawData) => {
      const response = JSON.parse(msg.toString());

      if (response.type !== "http-response" || response.requestId !== requestId) {
        return;
      }

      ws.off("message", onMessage);
      res.writeHead(response.status, response.headers);
      res.end(Buffer.from(response.body, "base64"));
    };

    ws.on("message", onMessage);

    const payload = {
      type: "http-request",
      timestamp: Date.now(),
      requestId,
      method: req.method,
      url: req.url,
      headers: req.headers,
      body,
    } satisfies Message;

    ws.send(JSON.stringify(payload));
  });
});

server.listen(process.env.PORT);
