import type { Params } from "@mikkel-ol/shared";
import type { WebSocket } from "ws";

export interface ClientInfo {
  ws: WebSocket;
  port: number;
  type: NonNullable<Params["type"]>;
}
