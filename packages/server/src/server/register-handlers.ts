import { registerHandler } from "@mikkel-ol/shared";
import { handleSocketProxyClose } from "../handlers/socket-proxy-close.js";
import { handleSocketProxyError } from "../handlers/socket-proxy-error.js";
import { handleSocketProxyMessage } from "../handlers/socket-proxy-message.js";
import { handleReload } from "../handlers/reload.js";

export function registerHandlers(): void {
  registerHandler("socket-proxy-close", handleSocketProxyClose);
  registerHandler("socket-proxy-error", handleSocketProxyError);
  registerHandler("socket-proxy-message", handleSocketProxyMessage);
  registerHandler("reload", handleReload);
}
