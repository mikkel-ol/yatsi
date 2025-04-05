import type { Message } from "../index.js";

export type Context<TMessage = Message> = {
  msg: TMessage;
};
