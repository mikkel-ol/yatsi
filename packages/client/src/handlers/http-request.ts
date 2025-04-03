import type { HttpRequestMessage, Message } from "@mikkel-ol/shared";
import { request } from "http";
import type { Context } from "../types/context.js";

export function httpRequestHandler(context: Context<HttpRequestMessage>): void {
  const { config, msg, ws } = context;
  const { port } = config;
  const { requestId, method, url, headers, body } = msg;

  const opts = {
    // ? Can we assume localhost exists? Or should we use 127.0.0.1?
    hostname: "localhost",
    port,
    path: url,
    method,
    headers,
  };

  const req = request(opts, (res) => {
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
