import type { RequestHandler } from "express";
import { CLIENTS } from "./clients.js";
import { logger, parse, type Message } from "@mikkel-ol/shared";
import { v4 as uuidv4 } from "uuid";
import type { RawData } from "ws";

const MAX_REQUEST_BYTES = 10 * 1024 * 1024;
const RESPONSE_START_TIMEOUT_MS = 30_000;

export const proxy: RequestHandler = (req, res) => {
  const { domain, subdomain } = parse(req.headers.host || "", process.env.DOMAIN);

  if (!domain) {
    res.status(400).json({ error: "No host found" });
    return;
  }

  if (!subdomain) {
    res.status(404).json({ error: `Unknown tunnel: ${req.headers.host}` });
    return;
  }

  const client = CLIENTS.get(subdomain);
  if (!client) {
    res.status(404).json({ error: `Unknown tunnel: ${subdomain}` });
    return;
  }

  logger.debug(`${req.method} ${subdomain}: ${req.url}`, req.socket.remoteAddress);

  const chunks: Buffer[] = [];
  let bodySize = 0;

  req.on("data", (chunk: Buffer) => {
    bodySize += chunk.length;
    if (bodySize > MAX_REQUEST_BYTES) {
      res.status(413).json({ error: "Request body too large" });
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on("end", () => {
    if (res.headersSent || res.writableEnded) return;

    const requestId = uuidv4();
    const ws = client.ws;
    let started = false;

    const cleanup = () => {
      clearTimeout(startTimeout);
      ws.off("message", onMessage);
      client.httpResponses.delete(requestId);
    };

    const fail = (status: number, message: string) => {
      cleanup();
      if (!res.headersSent) res.status(status).json({ error: message });
      else res.destroy(new Error(message));
    };

    const onMessage = (raw: RawData) => {
      let message: Message;
      try {
        message = JSON.parse(raw.toString()) as Message;
      } catch {
        return;
      }

      if (!("requestId" in message) || message.requestId !== requestId) return;

      switch (message.type) {
        case "http-response-start":
          started = true;
          clearTimeout(startTimeout);
          res.writeHead(message.status ?? 502, message.headers);
          res.flushHeaders();
          break;
        case "http-response-chunk":
          if (started) res.write(Buffer.from(message.body, "base64"));
          break;
        case "http-response-end":
          cleanup();
          res.end();
          break;
        case "http-response-error":
          fail(502, message.message);
          break;
      }
    };

    const startTimeout = setTimeout(
      () => fail(504, "Tunnel response timed out"),
      RESPONSE_START_TIMEOUT_MS,
    );

    ws.on("message", onMessage);
    client.httpResponses.set(requestId, res);
    res.on("close", cleanup);

    const payload: Message = {
      type: "http-request",
      timestamp: Date.now(),
      requestId,
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: Buffer.concat(chunks).toString("base64"),
    };

    ws.send(JSON.stringify(payload), (error) => {
      if (error) fail(502, "Tunnel connection is unavailable");
    });
  });
};
