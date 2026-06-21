import type { HttpRequestMessage, Message } from "@mikkel-ol/shared";
import { request } from "http";
import type { Context } from "../types/context.js";

export function httpRequestHandler(context: Context<HttpRequestMessage>): void {
  const { config, msg, requests, ws } = context;
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
    const start: Message = {
      type: "http-response-start",
      timestamp: Date.now(),
      requestId,
      status: res.statusCode,
      headers: res.headers,
    };
    ws.send(JSON.stringify(start));

    res.on("data", (chunk: Buffer) => {
      const message: Message = {
        type: "http-response-chunk",
        timestamp: Date.now(),
        requestId,
        body: chunk.toString("base64"),
      };
      ws.send(JSON.stringify(message));
    });

    res.on("end", () => {
      requests.delete(requestId);
      const message: Message = {
        type: "http-response-end",
        timestamp: Date.now(),
        requestId,
      };
      ws.send(JSON.stringify(message));
    });
  });
  requests.set(requestId, req);

  req.on("error", (e) => {
    requests.delete(requestId);
    if (ws.readyState !== ws.OPEN) return;
    const message: Message = {
      type: "http-response-error",
      timestamp: Date.now(),
      requestId,
      message: e instanceof Error ? e.message : String(e),
    };

    ws.send(JSON.stringify(message));
  });

  if (body) {
    req.write(Buffer.from(body, "base64"));
  }

  req.end();
}
