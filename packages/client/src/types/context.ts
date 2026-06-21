import type { Message } from "@mikkel-ol/shared";
import type { Config } from "../config.js";
import type { ClientRequest } from "http";
import WebSocket from "ws";

export interface ProxyConnection {
  socket: WebSocket;
  pending: Array<{ data: Buffer; binary: boolean }>;
}

export interface Context<T extends Message = Message> {
  ws: WebSocket;
  proxies: Map<string, ProxyConnection>;
  requests: Map<string, ClientRequest>;
  msg: T;
  config: Config;
}
