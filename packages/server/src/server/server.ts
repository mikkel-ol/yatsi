import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { logger } from "@mikkel-ol/shared";
import { proxy } from "./proxy.js";
import { newConnection } from "./socket.js";
import { authenticate } from "./auth.js";
import { registerHandlers } from "./register-handlers.js";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, verifyClient: authenticate });

registerHandlers();

/**
 * Incoming WebSocket connections from clients
 *
 * This can be both a new tunnel connection or a connection to be proxied
 */
wss.on("connection", newConnection);

/**
 * Handle incoming HTTP requests to a tunnel and forward them to the client socket
 */
app.use(proxy);

server.on("listening", () => logger.success(`Server running on port ${process.env.PORT}`));
server.listen(process.env.PORT);

/**
 * Gracefully shutdown
 */
process.on("SIGINT", () => {
  logger.info("Shutting down server..");

  wss.clients.forEach((client) => client.terminate());
  server.closeAllConnections();
  process.exit(0);
});
