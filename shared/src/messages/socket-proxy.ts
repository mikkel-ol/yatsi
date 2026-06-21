import type { IncomingHttpHeaders } from "http";
import type { WebSocket } from "ws";

export interface SocketProxyOpenMessage {
  type: "socket-proxy-open";
  timestamp: number;
  connectionId: string;
  url: string;
  headers: IncomingHttpHeaders;
  protocol: WebSocket["protocol"];
}

export interface SocketProxyMessage {
  type: "socket-proxy-message";
  timestamp: number;
  connectionId: string;
  data: string;
  binary: boolean;
}

export interface SocketProxyCloseMessage {
  type: "socket-proxy-close";
  timestamp: number;
  connectionId: string;
  code: number;
  reason: string;
}

export interface SocketProxyErrorMessage {
  type: "socket-proxy-error";
  timestamp: number;
  connectionId: string;
  message: string;
}
