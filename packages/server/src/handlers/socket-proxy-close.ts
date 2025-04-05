import { type SocketProxyCloseMessage } from "@mikkel-ol/shared";
import type { Context } from "../types/context.js";

export function handleSocketProxyClose(context: Context<SocketProxyCloseMessage>): void {
  const { ws, msg } = context;

  ws.close(msg.code, msg.reason);
}
