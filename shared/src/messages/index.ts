import type { CustomMessage } from "./custom.js";
import type { HttpRequestMessage } from "./http-request.js";
import type { HttpResponseMessage } from "./http-response.js";
import type { TunnelReadyMessage } from "./ready.js";
import type {
  SocketProxyCloseMessage,
  SocketProxyErrorMessage,
  SocketProxyMessage,
  SocketProxyOpenMessage,
} from "./socket-proxy.js";

export * from "./http-request.js";
export * from "./http-response.js";
export * from "./ready.js";
export * from "./socket-proxy.js";
export * from "./custom.js";

export type Message =
  | HttpRequestMessage
  | HttpResponseMessage
  | SocketProxyOpenMessage
  | SocketProxyMessage
  | SocketProxyCloseMessage
  | SocketProxyErrorMessage
  | TunnelReadyMessage
  | CustomMessage;

export type MessageType = Message["type"];

export type MessageByType = {
  [M in Message as M["type"]]: Extract<Message, { type: M["type"] }>;
};
