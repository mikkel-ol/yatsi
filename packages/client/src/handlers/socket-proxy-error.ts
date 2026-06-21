import { logger, type SocketProxyErrorMessage } from "@mikkel-ol/shared";
import type { Context } from "../types/context.js";

export function handleSocketProxyError(context: Context<SocketProxyErrorMessage>): void {
  const { proxies, msg } = context;

  logger.debug("Socket proxy error", msg);
  proxies.get(msg.connectionId)?.socket.close(1011, msg.message);
  proxies.delete(msg.connectionId);
}
