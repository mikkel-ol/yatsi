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
import type { ProxyConnection } from "./types/context.js";

registerHandlers();

export interface Tunnel {
  url: string;
  close(): void;
  closed: Promise<void>;
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
    const proxies = new Map<string, ProxyConnection>();
    const requests = new Map<string, import("http").ClientRequest>();
    const closed = new Promise<void>((resolve) => ws.once("close", resolve));

    ws.on("error", (err) => {
      const unauthenticated = err.message.includes("401");

      if (unauthenticated) {
        logger.error(`Tunnel authentication failed with key: ${token}`);
      } else {
        logger.error("Tunnel error", err);
      }
    });

    ws.on("close", () => {
      proxies.forEach((proxy) => proxy.socket.close());
      proxies.clear();
      requests.forEach((request) => request.destroy());
      requests.clear();
      logger.info("Tunnel closed");
    });

    return new Promise((resolve, reject) => {
      ws.once("error", reject);
      ws.on("message", (data) => {
        logger.debug("Incoming message", data.toString());

        try {
          const msg = JSON.parse(data.toString()) as Message;

          if (msg.type === "tunnel-ready") {
            ws.removeListener("error", reject);
            return resolve({
              url: msg.url,
              close: () => ws.close(1000, "Tunnel closed by client"),
              closed,
            });
          } else {
            dispatchMessage({
              ws,
              proxies,
              requests,
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
