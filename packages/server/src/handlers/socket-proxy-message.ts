import type { SocketProxyMessage } from "@mikkel-ol/shared";
import type { Context } from "../types/context.js";

export function handleSocketProxyMessage(context: Context<SocketProxyMessage>): void {
  const { ws, msg } = context;

  ws.send(msg.data);
}
