import type { IncomingMessage } from "http";
import type { VerifyClientCallbackAsync } from "ws";
import { CLIENTS } from "./clients.js";
import { logger, parse } from "@mikkel-ol/shared";

export const authenticate: VerifyClientCallbackAsync<IncomingMessage> = ({ req }, done) => {
  const { subdomain } = parse(req.headers.host || "", process.env.DOMAIN);

  logger.debug(`Authenticating: '${subdomain}'`);

  // If socket connection directly to the tunnel,
  // we need to check if the subdomain is valid
  // and allow any connection if so
  if (subdomain) {
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
  const apiKey = searchParams.get("token");

  logger.debug(`No subdomain found, authentication API key: '${apiKey}'`);

  if (!apiKey) {
    return done(false, 401, "Invalid API key");
  }

  const isValidKey = process.env.API_KEY === apiKey;

  if (!isValidKey) {
    return done(false, 401, "Invalid API key");
  }

  return done(true);
};
