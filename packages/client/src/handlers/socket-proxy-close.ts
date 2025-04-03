import { logger, type SocketProxyErrorMessage } from "@mikkel-ol/shared";
import type { Context } from "../types/context.js";

export function handleSocketProxyClose(context: Context<SocketProxyErrorMessage>): void {
  const { proxy, msg } = context;

  logger.debug("Socket proxy close", msg);
  proxy?.close();
}
