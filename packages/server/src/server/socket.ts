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

export function newConnection(ws: WebSocket, req: IncomingMessage): void {
  logger.debug("Incoming WebSocket connection", req.url, req.socket.remoteAddress);

  // https://subdomain.tunnel.dev?__tunnel_init__=1&token=apikey&type=mf&port=1234&subdomain=mytunnel
  const searchParams = new URLSearchParams((req.url || "").split("?")[1]);

  const isInit = searchParams.get(__INIT_PARAM__) === __INIT_PARAM_VALUE__;

  if (isInit) {
    return handleNewTunnel(ws, req);
  } else {
    return handleProxySocket(ws, req);
  }
}

function handleNewTunnel(ws: WebSocket, req: IncomingMessage) {
  // https://subdomain.tunnel.dev?token=apikey&type=mf&port=1234&subdomain=mytunnel
  const searchParams = new URLSearchParams((req.url || "").split("?")[1]);
  const result = safeParseParams(searchParams);

  if (!result.success) {
    ws.close(1003, `Invalid parameters: ${JSON.stringify(result.error.format())}`);
    return;
  }

  const { port, subdomain, type } = result.data;
  const slug = subdomain || generateSlug(2);
  const doesSlugExist = !!CLIENTS.get(slug);

  if (doesSlugExist) {
    return ws.close(1003, `Subdomain already in use: ${slug}`);
  }

  const client: ClientInfo = {
    ws,
    port,
    type,
    slug,
  };

  CLIENTS.set(slug, client);

  ws.on("message", (data) => {
    try {
      const msg: Message = JSON.parse(data.toString());
      logger.debug(`Incoming message on ${client.slug}`, msg);

      dispatchMessage({
        ws,
        msg,
      });
    } catch (err) {
      logger.error("Failed to parse message", err);
    }
  });

  ws.on("close", () => {
    CLIENTS.delete(slug);
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

  proxy.on("message", (data) => {
    try {
      const msg: Message = JSON.parse(data.toString());

      dispatchMessage({
        ws,
        msg,
      });
    } catch (err) {
      logger.error("Failed to parse message", err);
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
