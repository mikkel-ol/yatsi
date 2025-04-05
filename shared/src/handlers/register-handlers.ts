import { logger, type MessageByType, type MessageType } from "../index.js";
import type { Context } from "./context.js";

type Handler<T extends Context> = (context: T) => void;

type HandlerMap<TContext extends Context> = {
  [K in keyof MessageByType]?: Array<Handler<TContext>>;
};

/**
 * Message handlers
 */
const handlerMap: HandlerMap<any> = {};

export function registerHandler<
  TMessageType extends MessageType,
  TMsg extends MessageByType[TMessageType],
  TContext extends Context<TMsg>,
>(type: TMessageType, handler: Handler<TContext>): void {
  const existingHandlers = handlerMap[type] ?? [];
  handlerMap[type] = [...existingHandlers, handler];
}

export function dispatchMessage<TContext extends Context>(context: TContext) {
  const handlers = handlerMap[context.msg.type];

  if (handlers?.length) {
    handlers.forEach((fn) => fn(context));
  } else {
    logger.debug("No handler for type:", context.msg.type);
  }
}
