import {
  __INIT_PARAM__,
  __INIT_PARAM_VALUE__,
  DEFAULT_DOMAIN,
  logger,
  Params,
  parseParams,
  type Message,
  type Stringify,
} from "@mikkel-ol/shared";
import http from "http";
import WebSocket from "ws";
import { z } from "zod";

const schema = z.object({
  token: z.string(),
  secure: z.boolean().default(true),
  domain: z.string().default(DEFAULT_DOMAIN),
  subdomain: z.string().optional(),
  port: z.number().int().positive(),
});

export interface Tunnel {
  url: string;
}

export const tunnel = {
  async start(config: z.input<typeof schema>): Promise<Tunnel> {
    const { token, secure, domain, subdomain, port } = schema.parse(config);

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

    return new Promise((resolve, reject) => {
      ws.on("message", (data) => {
        logger.debug("Incoming message", data.toString());
        const msg: Message = JSON.parse(data.toString());

        if (msg.type === "tunnel-ready") {
          return resolve({ url: msg.url });
        }

        if (msg.type === "http-request") {
          const { requestId, method, url, headers, body } = msg;
          const opts = {
            // ? Is this volatile?
            hostname: "localhost",
            port,
            path: url,
            method,
            headers,
          };

          const req = http.request(opts, (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk) => chunks.push(chunk));

            res.on("end", () => {
              const message: Message = {
                type: "http-response",
                timestamp: Date.now(),
                requestId,
                status: res.statusCode,
                headers: res.headers,
                body: Buffer.concat(chunks).toString("base64"),
              };

              ws.send(JSON.stringify(message));
            });
          });

          req.on("error", (e) => {
            const message: Message = {
              type: "http-response",
              timestamp: Date.now(),
              requestId,
              status: 502,
              headers: {},
              body: JSON.stringify(e),
            };

            ws.send(JSON.stringify(message));
          });

          if (body) {
            req.write(Buffer.from(body, "base64"));
          }

          req.end();
        }

        let proxyWs: WebSocket | undefined;

        if (msg.type === "socket-proxy-open") {
          proxyWs = new WebSocket(`ws://localhost:${port}`, [msg.protocol], {
            headers: msg.headers,
          });

          proxyWs.on("message", (data) => {
            const message: Message = {
              type: "socket-proxy-message",
              timestamp: Date.now(),
              data: data.toString(),
            };
            ws.send(JSON.stringify(message));
          });

          proxyWs.on("error", (err) => {
            logger.error("Socket proxy error", err);

            const message: Message = {
              type: "socket-proxy-error",
              timestamp: Date.now(),
              error: err,
            };

            ws.send(JSON.stringify(message));
          });
        }

        if (msg.type === "socket-proxy-close" || msg.type === "socket-proxy-error") {
          logger.debug("Socket proxy close", msg);
          proxyWs?.close();
        }
      });

      ws.on("error", (err) => {
        const unauthenticated = err.message.includes("401");

        if (unauthenticated) {
          logger.error(`Tunnel authentication failed with key: ${token}`);
          return reject();
        } else {
          logger.error("Tunnel error", err);
          return reject(err);
        }
      });

      ws.on("close", () => {
        logger.info("Tunnel closed");
      });
    });
  },
};
