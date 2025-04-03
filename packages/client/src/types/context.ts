import type { Message } from "@mikkel-ol/shared";
import type { Config } from "../config.js";
import WebSocket from "ws";

export interface Context<T extends Message = Message> {
  ws: WebSocket;
  proxy?: WebSocket;
  msg: T;
  config: Config;
}
