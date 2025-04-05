import type { HttpRequestMessage } from "./http-request.js";
import type { HttpResponseMessage } from "./http-response.js";
import type { TunnelReadyMessage } from "./ready.js";
import type { ReloadMessage } from "./reload.js";
import type {
  SocketProxyCloseMessage,
  SocketProxyErrorMessage,
  SocketProxyMessage,
  SocketProxyOpenMessage,
} from "./socket-proxy.js";

export * from "./http-request.js";
export * from "./http-response.js";
export * from "./ready.js";
export * from "./reload.js";
export * from "./socket-proxy.js";

export type Message =
  | HttpRequestMessage
  | HttpResponseMessage
  | SocketProxyOpenMessage
  | SocketProxyMessage
  | SocketProxyCloseMessage
  | SocketProxyErrorMessage
  | TunnelReadyMessage
  | ReloadMessage;

export type MessageType = Message["type"];

export type MessageByType = {
  [M in Message as M["type"]]: Extract<Message, { type: M["type"] }>;
};
