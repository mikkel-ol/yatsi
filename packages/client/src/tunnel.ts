import {
  dispatchMessage,
  logger,
  parseParams,
  type Message as TunnelMessage,
  type Stringify,
  type CustomMessage,
  CreateTunnelParams,
} from "@mikkel-ol/shared";
import WebSocket from "ws";
import { config as configSchema, type Config } from "./config.js";
import { registerHandlers } from "./register-handlers.js";
import { addHandler, type CustomMessageHandler } from "./handlers/custom-message.js";

registerHandlers();

export interface Tunnel {
  url: string;
}

let ws: WebSocket | undefined = undefined;

export const tunnel = {
  /**
   * Start a tunnel connection to the server.
   *
   * @param config Configuration for the tunnel
   * @returns A promise that resolves to the tunnel URL
   */
  async start(config: Config): Promise<Tunnel> {
    const { token, secure, domain, subdomain, port } = configSchema.parse(config);

    const params = {
      port: port.toString(),
      token,
    } as const satisfies Stringify<CreateTunnelParams>;

    const query = new URLSearchParams(params);
    if (subdomain) query.set("subdomain", subdomain);

    parseParams(query, CreateTunnelParams);

    const wsSchema = secure ? "wss" : "ws";
    const url = `${wsSchema}://${domain}?${query.toString()}`;

    logger.debug(`Connecting to tunnel server at ${url}`);
    ws = new WebSocket(url);

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
      ws!.on("message", (data) => {
        logger.debug("Incoming message", data.toString());

        try {
          const msg = JSON.parse(data.toString()) as TunnelMessage;

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
          logger.error("Failed to deserialize message", err);
        }
      });
    });
  },

  /**
   * Send a custom message to the tunnel owner.
   *
   * @param data JSON-like data to send to the tunnel server, will be serialized.
   * @throws Error if the tunnel is not started
   * @throws Error if the data is not serializable
   */
  send(data: any): void {
    if (!ws) {
      throw new Error("Tunnel is not started");
    }

    const msg: CustomMessage = {
      type: "custom-message",
      timestamp: Date.now(),
      data,
    };

    try {
      const serializedMsg = JSON.stringify(msg);

      logger.debug("Sending message", msg);
      ws.send(serializedMsg);
    } catch (err) {
      logger.error("Failed to serialize message", err);
      throw new Error("Data is not serializable");
    }
  },

  /**
   * Attach an event handler to the tunnel connection.
   *
   * @param type The type of event to listen for.
   * @param callback Callback function to handle the event.
   * @throws Error if the tunnel is not started.
   * @example
   * tunnel.on('message', (msg) => {
   *   // Handle the message
   * });
   */
  on(type: "message", callback: CustomMessageHandler): void {
    addHandler(callback);
  },
};
