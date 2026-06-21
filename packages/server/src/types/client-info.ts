import type { Slug } from "@mikkel-ol/shared";
import type { Response } from "express";
import type { WebSocket } from "ws";

export interface ClientInfo {
  slug: Slug;
  ws: WebSocket;
  port: number;
  scope?: string;
  subject?: string;
  proxySockets: Map<string, WebSocket>;
  httpResponses: Map<string, Response>;
}
