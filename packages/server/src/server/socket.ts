import {
  CreateTunnelParams,
  dispatchMessage,
  HubParams,
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

export function newConnection(ws: WebSocket, req: IncomingMessage): void {
  logger.debug("Incoming WebSocket connection", req.url, req.socket.remoteAddress);

  const { subdomain } = parse(req.headers.host || "", process.env.DOMAIN);

  if (!subdomain) {
    return handleNewTunnel(ws, req);
  } else {
    return handleProxySocket(ws, req);
  }
}

function handleNewTunnel(ws: WebSocket, req: IncomingMessage) {
  const searchParams = new URLSearchParams((req.url || "").split("?")[1]);
  const result = safeParseParams(searchParams, CreateTunnelParams);

  if (!result.success) {
    ws.close(1003, `Invalid parameters: ${JSON.stringify(result.error.format())}`);
    return;
  }

  const { port, subdomain } = result.data;
  const slug = subdomain || generateSlug(2);
  const doesSlugExist = !!CLIENTS.get(slug);

  if (doesSlugExist) {
    return ws.close(1003, `Subdomain already in use: ${slug}`);
  }

  const client: ClientInfo = {
    id: uuidv4(),
    ws,
    port,
    slug,
    owner: true,
  };

  CLIENTS.set(slug, [client]);

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

  const connectedClients = CLIENTS.get(subdomain);

  if (!connectedClients) {
    return ws.close(1003, `Unknown tunnel: ${subdomain}`);
  }

  const searchParams = new URLSearchParams((req.url || "").split("?")[1]);
  const result = safeParseParams(searchParams, HubParams);

  if (!result.success) {
    ws.close(1003, `Invalid parameters: ${JSON.stringify(result.error.format())}`);
    return;
  }

  const { mode } = result.data;

  const client: ClientInfo = {
    id: uuidv4(),
    ws,
    slug: subdomain,
    owner: false,
  };

  CLIENTS.set(subdomain, [...connectedClients, client]);

  if (mode === "hub") {
    const owner = CLIENTS.get(subdomain)?.find((c) => c.owner)?.ws;

    if (!owner) {
      return ws.close(1003, `No owner found for tunnel: ${subdomain}`);
    }

    ws.on("message", (data) => {
      const message: Message = {
        type: "custom-message",
        timestamp: Date.now(),
        data: data.toString(),
      };

      owner.send(JSON.stringify(message));
    });
  }

  if (mode === "proxy") {
    const owner = CLIENTS.get(subdomain)?.find((c) => c.owner)?.ws;

    if (!owner) {
      return ws.close(1003, `No owner found for tunnel: ${subdomain}`);
    }

    owner.on("message", (data) => {
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

      owner.send(JSON.stringify(message));
    });

    const message: Message = {
      type: "socket-proxy-open",
      timestamp: Date.now(),
      headers: req.headers,
      protocol: ws.protocol,
    };

    owner.send(JSON.stringify(message));
  }

  ws.on("close", () => {
    logger.debug(`Client disconnected from ${subdomain}`, client.id);

    const currentClients = CLIENTS.get(subdomain) || [];
    const filteredClients = currentClients.filter((c) => c.id !== client.id);

    CLIENTS.set(subdomain, filteredClients);
  });
}
