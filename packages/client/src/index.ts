import WebSocket from "ws";

const port = 3000;
const type = "mfe";

(async () => {
  // Request a tunnel URL
  const response = await fetch("https://mytunnel.dev/request-tunnel", {
    method: "POST",
    body: JSON.stringify({ port, type }),
    headers: { "Content-Type": "application/json" },
  });

  const { token, url } = (await response.json()) as { token: string; url: string };

  console.log(`Tunnel ready: https://${url}`);

  // Connect WebSocket
  const ws = new WebSocket(`wss://mytunnel.dev?token=${token}&port=${port}&type=${type}`);

  // Send event messages (example)
  setInterval(() => {
    ws.send(JSON.stringify({ event: "heartbeat", timestamp: Date.now() }));
  }, 5000);
})();
