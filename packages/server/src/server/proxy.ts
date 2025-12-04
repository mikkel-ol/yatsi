import type { RequestHandler } from "express";
import { CLIENTS } from "./clients.js";
import { logger, parse, type Message } from "@mikkel-ol/shared";
import { v4 as uuidv4 } from "uuid";
import type { RawData } from "ws";

/**
 * Handle incoming HTTP requests to a tunnel and forward them to the client socket
 */
export const proxy: RequestHandler = (req, res) => {
  const { domain, subdomain } = parse(req.headers.host || "", process.env.DOMAIN);

  if (!domain) {
    res.json({ error: "No host found" }).status(400);
    return;
  }

  if (!subdomain) {
    res.json({ error: `Unknown tunnel: ${subdomain}.${domain}` }).status(400);
    return;
  }

  const connectedClients = CLIENTS.get(subdomain);

  if (!connectedClients) {
    res.json({ error: `Unknown tunnel: ${subdomain}` }).status(400);
    return;
  }

  const initiatorClient = connectedClients.find((client) => client.owner);

  if (!initiatorClient) {
    res.json({ error: `No client found for tunnel: ${subdomain}` }).status(400);
    return;
  }

  logger.debug(`${req.method} ${subdomain}: ${req.url}`, req.socket.remoteAddress);

  const ws = initiatorClient.ws;

  // Load all the chunk data from the request
  const chunks: Buffer[] = [];
  req.on("data", (chunk) => chunks.push(chunk));

  // When the request ends, send the data to the client over the WebSocket
  req.on("end", () => {
    const requestId = uuidv4();
    const body = Buffer.concat(chunks).toString("base64");

    // 2. Listen for the response from the client
    const onMessage = (msg: RawData) => {
      const response = JSON.parse(msg.toString()) as Message;

      // 3. Forward the response back to the original request
      if (response.type === "http-response" && response.requestId === requestId) {
        ws.off("message", onMessage);
        res.writeHead(response.status ?? 0, response.headers);
        res.end(Buffer.from(response.body, "base64"));
      }
    };

    ws.on("message", onMessage);

    // 1. Send the request to the client
    const payload: Message = {
      type: "http-request",
      timestamp: Date.now(),
      requestId,
      method: req.method,
      url: req.url,
      headers: req.headers,
      body,
    };

    ws.send(JSON.stringify(payload));
  });
};
