import { __INIT_PARAM__, __INIT_PARAM_VALUE__, logger, safeParseParams, type Message } from "@mikkel-ol/shared";
import type { IncomingMessage } from "http";
import type { WebSocket } from "ws";
import type { ClientInfo } from "../types/client-info.js";
import { CLIENTS } from "./clients.js";
import { parse } from "tldts";

export const newConnection = (ws: WebSocket, req: IncomingMessage) => {
  logger.debug("Incoming WebSocket connection", req.url, req.socket.remoteAddress);

  // https://subdomain.tunnel.dev?__tunnel_init__=1&token=apikey&type=mf&port=1234&subdomain=mytunnel
  const searchParams = new URLSearchParams((req.url || "").split("?")[1]);

  const isInit = searchParams.get(__INIT_PARAM__) === __INIT_PARAM_VALUE__;

  if (isInit) {
    return handleNewTunnel(ws, req);
  } else {
    return handleProxySocket(ws, req);
  }
};

function handleNewTunnel(ws: WebSocket, req: IncomingMessage) {
  // https://subdomain.tunnel.dev?pleasegivemea=tunnel&token=apikey&type=mf&port=1234&subdomain=mytunnel
  const searchParams = new URLSearchParams((req.url || "").split("?")[1]);

  const result = safeParseParams(searchParams);

  if (!result.success) {
    ws.close(1003, `Invalid parameters: ${JSON.stringify(result.error.format())}`);
    return;
  }

  const { port, subdomain, type } = result.data;

  const slug = subdomain || "vast-ice"; //subdomain || generateSlug(2);

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
    const message: Message = JSON.parse(data.toString());
    logger.debug(`Incoming message on ${client.slug}`, message);

    if (type === "mf" && message.type === "reload") {
      CLIENTS.forEach((client) => {
        if (client.type === "host") {
          client.ws.send(JSON.stringify(message));
        }
      });
    }
  });

  ws.on("close", () => {
    CLIENTS.delete(slug);
  });

  const message: Message = {
    type: "tunnel-ready",
    timestamp: Date.now(),
    url: `https://${slug}.${process.env.DOMAIN}`,
  };

  ws.send(JSON.stringify(message));
}

function handleProxySocket(ws: WebSocket, req: IncomingMessage) {
  const parseResult = parse(req.headers.host || "");
  const subdomain = parseResult.subdomain || parseResult.domainWithoutSuffix;

  if (!subdomain) {
    return ws.close(1003, `Unknown tunnel: ${req.headers.host}`);
  }

  const client = CLIENTS.get(subdomain);

  if (!client) {
    return ws.close(1003, `Unknown tunnel: ${subdomain}`);
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
