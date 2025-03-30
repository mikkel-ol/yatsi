import type { IncomingMessage } from "http";
import type { VerifyClientCallbackAsync } from "ws";

export const authenticate: VerifyClientCallbackAsync<IncomingMessage> = ({ req }, done) => {
  // https://subdomain.tunnel.dev?pleasegivemea=tunnel&token=apikey&type=mf&port=1234&subdomain=mytunnel
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
