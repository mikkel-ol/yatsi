import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, request } from "node:http";
import { once } from "node:events";
import { test } from "node:test";
import wsPackage from "../packages/server/node_modules/ws/index.js";
import { createGrantClient, tunnel } from "../packages/client/dist/index.js";

const { WebSocketServer, WebSocket } = wsPackage;

test("proxies HTTP, SSE, WebSockets, and delegated grant revocation", async (t) => {
  let longStreamStarted;
  const longStreamReady = new Promise((resolve) => {
    longStreamStarted = resolve;
  });
  const fixture = createServer((req, res) => {
    if (req.url === "/events") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      });
      res.write("data: one\n\n");
      setTimeout(() => res.end("data: two\n\n"), 25);
      return;
    }
    if (req.url === "/long-events") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      });
      res.write("data: connected\n\n");
      longStreamStarted();
      return;
    }

    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ url: req.url, body: Buffer.concat(chunks).toString() }));
    });
  });
  const fixtureSockets = new WebSocketServer({ server: fixture });
  fixtureSockets.on("connection", (socket) => {
    socket.on("message", (data, binary) => socket.send(data, { binary }));
  });
  fixture.listen(0, "127.0.0.1");
  await once(fixture, "listening");
  t.after(() => {
    fixtureSockets.close();
    fixture.close();
  });
  const fixturePort = fixture.address().port;

  const yatsiPort = await availablePort();
  const server = spawn(process.execPath, ["dist/server/server.js"], {
    cwd: new URL("../packages/server/", import.meta.url),
    env: {
      ...process.env,
      PORT: String(yatsiPort),
      DOMAIN: `localhost:${yatsiPort}`,
      SECURE: "false",
      API_KEY: "integration-key",
      LOG_LEVEL: "2",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => server.kill("SIGINT"));
  await waitForServer(server, yatsiPort);

  const grants = createGrantClient({
    serverUrl: `http://localhost:${yatsiPort}`,
    apiKey: "integration-key",
  });
  const grant = await grants.create({
    scope: "session-a",
    subject: "remote-a",
    expiresInSeconds: 60,
  });

  const activeTunnel = await tunnel.start({
    secure: false,
    domain: `localhost:${yatsiPort}`,
    subdomain: "integration-remote",
    port: fixturePort,
    token: grant.token,
  });
  assert.equal(activeTunnel.url, `http://integration-remote.localhost:${yatsiPort}`);

  const response = await tunneledRequest(yatsiPort, "/hello", "payload");
  assert.deepEqual(JSON.parse(response), { url: "/hello", body: "payload" });

  const events = await tunneledRequest(yatsiPort, "/events");
  assert.equal(events, "data: one\n\ndata: two\n\n");

  const ws = new WebSocket(`ws://integration-remote.localhost:${yatsiPort}/echo`);
  await withTimeout(once(ws, "open"), "WebSocket did not open");
  ws.send("hello websocket");
  const [message] = await withTimeout(once(ws, "message"), "WebSocket echo timed out");
  assert.equal(message.toString(), "hello websocket");
  ws.close();

  const longEvents = tunneledRequest(yatsiPort, "/long-events");
  await longStreamReady;
  await grants.revoke({ scope: "session-a", subject: "remote-a" });
  await withTimeout(activeTunnel.closed, "Revoked tunnel did not close");
  assert.equal(
    await withTimeout(longEvents, "Active HTTP stream did not close with its tunnel"),
    "data: connected\n\n",
  );

  const missing = await tunneledStatus(yatsiPort, "/hello");
  assert.equal(missing, 404);
});

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(process, port) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      await fetch(`http://localhost:${port}/_yatsi/grants`, {
        headers: { Authorization: "Bearer invalid" },
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  process.kill("SIGINT");
  throw new Error("YATSI server did not start");
}

function tunneledRequest(port, path, body) {
  return new Promise((resolve, reject) => {
    const req = createServerRequest(port, path, body, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on("error", reject);
  });
}

function tunneledStatus(port, path) {
  return new Promise((resolve, reject) => {
    const req = createServerRequest(port, path, undefined, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);
  });
}

function createServerRequest(port, path, body, onResponse) {
  const req = request({
    hostname: "127.0.0.1",
    port,
    path,
    method: body === undefined ? "GET" : "POST",
    headers: {
      host: `integration-remote.localhost:${port}`,
    },
  }, onResponse);
  if (body !== undefined) req.end(body);
  else req.end();
  return req;
}

async function withTimeout(promise, message, timeoutMs = 5_000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
