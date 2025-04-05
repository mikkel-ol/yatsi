import type { Message } from "@mikkel-ol/shared";
import WebSocket from "ws";

export interface Context<T extends Message = Message> {
  ws: WebSocket;
  msg: T;
}
