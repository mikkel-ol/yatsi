import type { SocketProxyMessage } from "@mikkel-ol/shared";
import type { Context } from "../types/context.js";

export function handleSocketProxyMessage(context: Context<SocketProxyMessage>): void {
  const connection = context.proxies.get(context.msg.connectionId);
  if (!connection) return;

  const data = Buffer.from(context.msg.data, "base64");
  if (connection.socket.readyState === connection.socket.OPEN) {
    connection.socket.send(context.msg.binary ? data : data.toString());
  } else if (connection.socket.readyState === connection.socket.CONNECTING) {
    connection.pending.push({ data, binary: context.msg.binary });
  }
}
