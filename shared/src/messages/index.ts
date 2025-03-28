import type { HttpRequestMessage } from "./http-request.js";
import type { TunnelReadyMessage } from "./ready.js";
import type { ReloadMessage } from "./reload.js";

export type Message = HttpRequestMessage | TunnelReadyMessage | ReloadMessage;
