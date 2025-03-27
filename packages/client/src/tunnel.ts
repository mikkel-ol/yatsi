import { DEFAULT_DOMAIN, TUNNEL_ENDPOINT, type TunnelResponse } from "@mikkel-ol/shared";
import WebSocket from "ws";
import { z } from "zod";

const type = "mfe";

const schema = z.object({
  domain: z.string().default(DEFAULT_DOMAIN).optional(),
  port: z.number().int().positive(),
});

export interface Tunnel {
  url: string;
}

export const tunnel = {
  async start(config: z.infer<typeof schema>): Promise<Tunnel> {
    const { port } = schema.parse(config);

    // Request a tunnel URL
    const requestTunnelUrl = new URL(TUNNEL_ENDPOINT, `https://${config.domain}`).toString();
    const response = await fetch(requestTunnelUrl, {
      method: "POST",
      body: JSON.stringify({ port, type }),
      headers: { "Content-Type": "application/json" },
    });

    const { slug, url } = (await response.json()) as TunnelResponse;

    console.log(`Tunnel ready: https://${url}`);

    // Connect WebSocket
    const ws = new WebSocket(`wss://mytunnel.dev?token=${slug}&port=${port}&type=${type}`);

    // Send event messages (example)
    setInterval(() => {
      ws.send(JSON.stringify({ event: "heartbeat", timestamp: Date.now() }));
    }, 5000);

    return { url };
  },
};
