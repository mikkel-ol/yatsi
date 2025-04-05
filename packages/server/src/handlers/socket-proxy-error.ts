import { type SocketProxyErrorMessage } from "@mikkel-ol/shared";
import type { Context } from "../types/context.js";

export function handleSocketProxyError(context: Context<SocketProxyErrorMessage>): void {
  const { ws, msg } = context;

  ws.close(1003, msg.error.message);
}
