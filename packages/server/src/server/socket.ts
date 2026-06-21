import {
  __INIT_PARAM__,
  __INIT_PARAM_VALUE__,
  dispatchMessage,
  logger,
  parse,
  safeParseParams,
  type Message,
} from "@mikkel-ol/shared";
import type { IncomingMessage } from "http";
import type { WebSocket } from "ws";
import type { ClientInfo } from "../types/client-info.js";
import { CLIENTS } from "./clients.js";
import { generateSlug } from "random-word-slugs";
import { v4 as uuidv4 } from "uuid";
import { consumeGrant, releaseGrant } from "./grants.js";

export function newConnection(ws: WebSocket, req: IncomingMessage): void {
  logger.debug("Incoming WebSocket connection", req.url, req.socket.remoteAddress);

  const searchParams = new URLSearchParams((req.url || "").split("?")[1]);

  const isInit = searchParams.get(__INIT_PARAM__) === __INIT_PARAM_VALUE__;

  if (isInit) {
    return handleNewTunnel(ws, req);
  } else {
    return handleProxySocket(ws, req);
  }
}

function handleNewTunnel(ws: WebSocket, req: IncomingMessage) {
  const searchParams = new URLSearchParams((req.url || "").split("?")[1]);
  const result = safeParseParams(searchParams);

  if (!result.success) {
    ws.close(1003, `Invalid parameters: ${JSON.stringify(result.error.format())}`);
    return;
  }

  const { port, subdomain, token } = result.data;
  const slug = subdomain || generateSlug(2);
  const doesSlugExist = !!CLIENTS.get(slug);

  if (doesSlugExist) {
    return ws.close(1003, `Subdomain already in use: ${slug}`);
  }

  let grant: ReturnType<typeof consumeGrant>;
  try {
    grant = consumeGrant(token, { slug, ws });
  } catch (error) {
    ws.close(4003, error instanceof Error ? error.message : "Invalid tunnel grant");
    return;
  }

  const client: ClientInfo = {
    ws,
    port,
    slug,
    scope: grant?.scope,
    subject: grant?.subject,
    proxySockets: new Map(),
    httpResponses: new Map(),
  };

  CLIENTS.set(slug, client);

  ws.on("message", (data) => {
    try {
      const msg: Message = JSON.parse(data.toString());
      logger.debug(`Incoming message on ${client.slug}`, msg);

      routeProxyMessage(client, msg);
    } catch (err) {
      logger.error("Failed to parse message", err);
    }
  });

  ws.on("close", () => {
    client.proxySockets.forEach((proxy) => proxy.close(1012, "Tunnel disconnected"));
    client.proxySockets.clear();
    client.httpResponses.forEach((response) => {
      if (response.headersSent) response.end();
      else response.status(502).json({ error: "Tunnel disconnected" });
    });
    client.httpResponses.clear();
    CLIENTS.delete(slug);
    releaseGrant(token);
  });

  const protocol = process.env.SECURE === "true" ? "https" : "http";

  const message: Message = {
    type: "tunnel-ready",
    timestamp: Date.now(),
    url: `${protocol}://${slug}.${process.env.DOMAIN}`,
  };

  ws.send(JSON.stringify(message));
}

function handleProxySocket(ws: WebSocket, req: IncomingMessage) {
  const { subdomain } = parse(req.headers.host || "", process.env.DOMAIN);

  if (!subdomain) {
    return ws.close(1003, `Unknown tunnel: ${req.headers.host}`);
  }

  const client = CLIENTS.get(subdomain);

  if (!client) {
    return ws.close(1003, `Unknown tunnel: ${subdomain}`);
  }

  const proxy = client.ws;
  const connectionId = uuidv4();
  client.proxySockets.set(connectionId, ws);

  ws.on("message", (data, isBinary) => {
    const message: Message = {
      type: "socket-proxy-message",
      timestamp: Date.now(),
      connectionId,
      data: Buffer.from(data as Buffer).toString("base64"),
      binary: isBinary,
    };

    proxy.send(JSON.stringify(message));
  });

  ws.on("close", (code, reason) => {
    client.proxySockets.delete(connectionId);
    if (proxy.readyState !== proxy.OPEN) return;
    const message: Message = {
      type: "socket-proxy-close",
      timestamp: Date.now(),
      connectionId,
      code: code === 1005 ? 1000 : code,
      reason: reason.toString(),
    };
    proxy.send(JSON.stringify(message));
  });

  ws.on("error", (error) => {
    if (proxy.readyState !== proxy.OPEN) return;
    const message: Message = {
      type: "socket-proxy-error",
      timestamp: Date.now(),
      connectionId,
      message: error.message,
    };
    proxy.send(JSON.stringify(message));
  });

  const message: Message = {
    type: "socket-proxy-open",
    timestamp: Date.now(),
    connectionId,
    url: req.url || "/",
    headers: req.headers,
    protocol: ws.protocol,
  };

  proxy.send(JSON.stringify(message));
}

function routeProxyMessage(client: ClientInfo, msg: Message): void {
  if (
    msg.type !== "socket-proxy-message" &&
    msg.type !== "socket-proxy-close" &&
    msg.type !== "socket-proxy-error"
  ) {
    return;
  }

  const socket = client.proxySockets.get(msg.connectionId);
  if (!socket) return;

  if (msg.type === "socket-proxy-message") {
    const data = Buffer.from(msg.data, "base64");
    socket.send(msg.binary ? data : data.toString());
    return;
  }

  client.proxySockets.delete(msg.connectionId);
  socket.close(
    msg.type === "socket-proxy-close" ? msg.code : 1011,
    msg.type === "socket-proxy-close" ? msg.reason : msg.message,
  );
}
