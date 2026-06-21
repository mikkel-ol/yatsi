import { logger, type SocketProxyCloseMessage } from "@mikkel-ol/shared";
import type { Context } from "../types/context.js";

export function handleSocketProxyClose(context: Context<SocketProxyCloseMessage>): void {
  const { proxies, msg } = context;

  logger.debug("Socket proxy close", msg);
  const code = msg.code >= 1000 && msg.code <= 4999 && msg.code !== 1005 ? msg.code : 1000;
  proxies.get(msg.connectionId)?.socket.close(code, msg.reason);
  proxies.delete(msg.connectionId);
}
