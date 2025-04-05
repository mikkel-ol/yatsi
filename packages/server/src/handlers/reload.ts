import { type ReloadMessage } from "@mikkel-ol/shared";
import type { Context } from "../types/context.js";

export function handleReload(context: Context<ReloadMessage>): void {
  const { ws, msg } = context;
}
