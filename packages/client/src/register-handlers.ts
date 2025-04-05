import { registerHandler } from "@mikkel-ol/shared";
import { httpRequestHandler } from "./handlers/http-request.js";
import { handleSocketProxyOpen } from "./handlers/socket-proxy-open.js";
import { handleSocketProxyClose } from "./handlers/socket-proxy-close.js";
import { handleSocketProxyError } from "./handlers/socket-proxy-error.js";

export function registerHandlers(): void {
  registerHandler("http-request", httpRequestHandler);
  registerHandler("socket-proxy-open", handleSocketProxyOpen);
  registerHandler("socket-proxy-close", handleSocketProxyClose);
  registerHandler("socket-proxy-error", handleSocketProxyError);
}
