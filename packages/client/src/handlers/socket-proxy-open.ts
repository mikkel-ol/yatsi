import { logger, type Message, type SocketProxyOpenMessage } from "@mikkel-ol/shared";
import WebSocket from "ws";
import type { Context } from "../types/context.js";

export function handleSocketProxyOpen(context: Context<SocketProxyOpenMessage>): void {
  const { config, msg, ws } = context;
  const { port } = config;

  // ? Can we assume localhost exists? Or should we use 127.0.0.1?
  const proxyWs = new WebSocket(`ws://localhost:${port}`, [msg.protocol], {
    headers: msg.headers,
  });

  proxyWs.on("message", (data) => {
    const message: Message = {
      type: "socket-proxy-message",
      timestamp: Date.now(),
      data: data.toString(),
    };

    ws.send(JSON.stringify(message));
  });

  proxyWs.on("error", (err) => {
    logger.error("Socket proxy error", err);

    const message: Message = {
      type: "socket-proxy-error",
      timestamp: Date.now(),
      error: err,
    };

    ws.send(JSON.stringify(message));
  });

  context.proxy = proxyWs;
}
