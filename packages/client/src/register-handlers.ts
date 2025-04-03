import { logger, type Message } from "@mikkel-ol/shared";
import { httpRequestHandler } from "./handlers/http-request.js";
import type { Context } from "./types/context.js";
import { handleSocketProxyOpen } from "./handlers/socket-proxy-open.js";
import { handleSocketProxyClose } from "./handlers/socket-proxy-close.js";
import { handleSocketProxyError } from "./handlers/socket-proxy-error.js";

type MessageByType = {
  [M in Message as M["type"]]: Extract<Message, { type: M["type"] }>;
};

type HandlerMap<T extends Message = any> = {
  [K in keyof MessageByType]?: ((context: Context<T>) => void)[];
};

/**
 * Message handlers
 */
const handlerMap: HandlerMap = {
  "http-request": [httpRequestHandler],
  "http-response": [],
  "socket-proxy-open": [handleSocketProxyOpen],
  "socket-proxy-close": [handleSocketProxyClose],
  "socket-proxy-error": [handleSocketProxyError],
};

export function dispatchMessage(context: Context) {
  const handlers = handlerMap[context.msg.type];

  if (handlers?.length) {
    handlers.forEach((fn) => fn(context));
  } else {
    logger.debug("No handler for type:", context.msg.type);
  }
}
