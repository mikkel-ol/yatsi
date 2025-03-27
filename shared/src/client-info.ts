import type { WebSocket } from "ws";

export interface ClientInfo {
  ws: WebSocket;
  port: number;
  type: "host" | "mf";
}
