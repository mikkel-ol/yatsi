import type { Params, Slug } from "@mikkel-ol/shared";
import type { WebSocket } from "ws";

export interface ClientInfo {
  slug: Slug;
  ws: WebSocket;
  port: number;
  type: NonNullable<Params["type"]>;
}
