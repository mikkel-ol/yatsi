import type { Context, CustomMessage } from "@mikkel-ol/shared";

export type CustomMessageHandler = (msg: any) => void;

const msgHandlers: CustomMessageHandler[] = [];

export function addHandler(handler: CustomMessageHandler): void {
  msgHandlers.push(handler);
}

export function customMessageHandler(context: Context<CustomMessage>): void {
  const { msg } = context;

  for (const handler of msgHandlers) {
    handler(msg.data);
  }
}
