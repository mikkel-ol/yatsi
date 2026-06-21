import { logger, type Message, type SocketProxyOpenMessage } from "@mikkel-ol/shared";
import WebSocket from "ws";
import type { Context, ProxyConnection } from "../types/context.js";

export function handleSocketProxyOpen(context: Context<SocketProxyOpenMessage>): void {
  const { config, msg, proxies, ws } = context;
  const { port } = config;

  const protocols = msg.protocol ? [msg.protocol] : undefined;
  const proxyWs = new WebSocket(`ws://127.0.0.1:${port}${msg.url}`, protocols, {
    headers: msg.headers,
  });

  const connection: ProxyConnection = { socket: proxyWs, pending: [] };
  proxies.set(msg.connectionId, connection);

  proxyWs.on("open", () => {
    for (const pending of connection.pending) {
      proxyWs.send(pending.binary ? pending.data : pending.data.toString());
    }
    connection.pending.length = 0;
  });

  proxyWs.on("message", (data, isBinary) => {
    const message: Message = {
      type: "socket-proxy-message",
      timestamp: Date.now(),
      connectionId: msg.connectionId,
      data: Buffer.from(data as Buffer).toString("base64"),
      binary: isBinary,
    };

    ws.send(JSON.stringify(message));
  });

  proxyWs.on("error", (err) => {
    logger.error("Socket proxy error", err);

    const message: Message = {
      type: "socket-proxy-error",
      timestamp: Date.now(),
      connectionId: msg.connectionId,
      message: err.message,
    };

    ws.send(JSON.stringify(message));
  });

  proxyWs.on("close", (code, reason) => {
    proxies.delete(msg.connectionId);
    const message: Message = {
      type: "socket-proxy-close",
      timestamp: Date.now(),
      connectionId: msg.connectionId,
      code: code === 1005 ? 1000 : code,
      reason: reason.toString(),
    };
    ws.send(JSON.stringify(message));
  });
}
