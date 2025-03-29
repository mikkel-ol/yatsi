import type { IncomingHttpHeaders } from "http";
import type { WebSocket } from "ws";

export interface SocketProxyOpenMessage {
  type: "socket-proxy-open";
  timestamp: number;
  headers: IncomingHttpHeaders;
  protocol: WebSocket["protocol"];
}

export interface SocketProxyMessage {
  type: "socket-proxy-message";
  timestamp: number;
  data: any;
}

export interface SocketProxyCloseMessage {
  type: "socket-proxy-close";
  timestamp: number;
  code: number;
  reason: string;
}

export interface SocketProxyErrorMessage {
  type: "socket-proxy-error";
  timestamp: number;
  error: Error;
}
