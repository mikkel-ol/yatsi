import type { IncomingMessage } from "http";
import type { VerifyClientCallbackAsync } from "ws";
import { CLIENTS } from "./clients.js";
import { logger, parse } from "@mikkel-ol/shared";
import { canUseTunnelToken } from "./grants.js";

export const authenticate: VerifyClientCallbackAsync<IncomingMessage> = ({ req }, done) => {
  const { subdomain } = parse(req.headers.host || "", process.env.DOMAIN);

  // If socket connection directly to the tunnel,
  // we need to check if the subdomain is valid
  // and allow any connection if so
  if (subdomain) {
    logger.debug(`Authenticating: '${subdomain}'`);

    const isClient = !!CLIENTS.get(subdomain);

    if (isClient) {
      return done(true);
    } else {
      return done(false, 401, `Unknown tunnel: ${subdomain}`);
    }
  }

  // else it is a new tunnel request
  // and we need to check the API key
  const searchParams = new URLSearchParams((req.url || "").split("?")[1]);
  const token = searchParams.get("token");
  logger.debug("Authenticating new tunnel");

  if (!canUseTunnelToken(token)) {
    return done(false, 401, "Invalid API key");
  }

  return done(true);
};
