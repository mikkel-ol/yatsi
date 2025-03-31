import type { IncomingMessage } from "http";
import { parse } from "tldts";
import type { VerifyClientCallbackAsync } from "ws";
import { CLIENTS } from "./clients.js";

export const authenticate: VerifyClientCallbackAsync<IncomingMessage> = ({ req }, done) => {
  const parseResult = parse(req.headers.host || "");
  const subdomain = parseResult.subdomain || parseResult.domainWithoutSuffix;

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

  if (!apiKey) {
    return done(false, 401, "Invalid API key");
  }

  const isValidKey = process.env.API_KEY === apiKey;

  if (!isValidKey) {
    return done(false, 401, "Invalid API key");
  }

  return done(true);
};
