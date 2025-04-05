import {
  __INIT_PARAM__,
  __INIT_PARAM_VALUE__,
  dispatchMessage,
  logger,
  Params,
  parseParams,
  type Message,
  type Stringify,
} from "@mikkel-ol/shared";
import WebSocket from "ws";
import { config as configSchema, type Config } from "./config.js";
import { registerHandlers } from "./register-handlers.js";

registerHandlers();

export interface Tunnel {
  url: string;
}

export const tunnel = {
  async start(config: Config): Promise<Tunnel> {
    const { token, secure, domain, subdomain, port } = configSchema.parse(config);

    const params = {
      [__INIT_PARAM__]: __INIT_PARAM_VALUE__,
      port: port.toString(),
      token,
    } as const satisfies Stringify<Params>;

    const query = new URLSearchParams(params);
    if (subdomain) query.set("subdomain", subdomain);

    parseParams(query);

    const wsSchema = secure ? "wss" : "ws";
    const url = `${wsSchema}://${domain}?${query.toString()}`;

    logger.debug(`Connecting to tunnel server at ${url}`);
    const ws = new WebSocket(url);

    ws.on("error", (err) => {
      const unauthenticated = err.message.includes("401");

      if (unauthenticated) {
        logger.error(`Tunnel authentication failed with key: ${token}`);
      } else {
        logger.error("Tunnel error", err);
      }
    });

    ws.on("close", () => {
      logger.info("Tunnel closed");
    });

    return new Promise((resolve) => {
      ws.on("message", (data) => {
        logger.debug("Incoming message", data.toString());

        try {
          const msg = JSON.parse(data.toString()) as Message;

          if (msg.type === "tunnel-ready") {
            return resolve({ url: msg.url });
          } else {
            dispatchMessage({
              ws,
              config,
              msg,
            });
          }
        } catch (err) {
          logger.error("Failed to parse message", err);
        }
      });
    });
  },
};
