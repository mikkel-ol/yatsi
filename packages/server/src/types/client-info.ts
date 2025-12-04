import type { Slug } from "@mikkel-ol/shared";
import type { WebSocket } from "ws";

export interface InitiatorClient {
  id: string;
  slug: Slug;
  ws: WebSocket;
  port: number;
  owner: true;
}

export interface ConnectedClient {
  id: string;
  slug: Slug;
  ws: WebSocket;
  owner: false;
}

export type ClientInfo = InitiatorClient | ConnectedClient;
