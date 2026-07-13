# @mikkel-ol/yatsi

**Yet Another Tunneling Service Implementation** — the client. Yes, the world has plenty of tunneling services. This one is yours.

YATSI exposes a local HTTP, SSE, or WebSocket service through a temporary public URL. No accounts, no dashboards, no "you've reached your free tier limit" emails at 2 AM — you host the server, you own the domain, you hand out the keys.

```sh
npx @mikkel-ol/yatsi <port> --domain tunnel.example.com --token <your-api-key>
# ✔ Tunnel ready at: https://brave-toaster.tunnel.example.com
```

Everything hitting that URL is forwarded to `localhost:<port>` — plain HTTP, streaming responses, Server-Sent Events, and WebSockets included.

This package is the client: a CLI and a library. It connects to a [YATSI server](https://github.com/mikkel-ol/yatsi) that you (or someone who likes you) host on a wildcard domain. Server setup lives in the [main README](https://github.com/mikkel-ol/yatsi#server-setup) — one Docker container, two DNS records, done.

## Table of contents

- [How it works](#how-it-works)
- [CLI](#cli)
- [Library](#library)
- [Tunnel grants](#tunnel-grants)
- [Options reference](#options-reference)

## How it works

The client opens a single outbound WebSocket to the server and authenticates with an API key. The server assigns a subdomain (a random two-word slug, or one you pick) and forwards all public traffic for that subdomain back through the tunnel to your local port. When the client disconnects, the URL dies with it.

## CLI

No install needed:

```sh
npx @mikkel-ol/yatsi <port> --domain tunnel.example.com --token <api-key>
```

Want a predictable URL? Ask for a subdomain:

```sh
npx @mikkel-ol/yatsi <port> --domain tunnel.example.com --token <api-key> --subdomain demo
# ✔ Tunnel ready at: https://demo.tunnel.example.com
```

Talking to a local or non-TLS tunnel server? Pass `--no-secure`:

```sh
npx @mikkel-ol/yatsi <port> --domain localhost:3000 --token <api-key> --no-secure
```

## Library

```sh
npm install @mikkel-ol/yatsi
```

```ts
import { tunnel } from "@mikkel-ol/yatsi";

const activeTunnel = await tunnel.start({
  port: 4200,
  domain: "tunnel.example.com",
  token: process.env.YATSI_API_KEY!,
});

console.log(activeTunnel.url); // https://brave-toaster.tunnel.example.com

// later
activeTunnel.close();
await activeTunnel.closed; // resolves once the tunnel is fully torn down
```

`tunnel.start()` resolves once the server confirms the public URL — no polling, no "is it up yet".

## Tunnel grants

Sometimes you want to let someone open a tunnel _without_ handing them your permanent API key — a CI job, a workshop attendee, a service you only half trust. That's what grants are for.

A **tunnel grant** is a single-use, short-lived token (max 5 minutes, default 60 seconds) that authorizes exactly one tunnel connection. Grants carry an issuer-defined `scope` and `subject` — YATSI treats both as opaque strings; you decide what they mean. Revoking a subject or a whole scope immediately closes any tunnels opened with those grants.

```ts
import { createGrantClient } from "@mikkel-ol/yatsi";

const grants = createGrantClient({
  serverUrl: "tunnel.example.com",
  apiKey: process.env.YATSI_API_KEY!, // grant control requires the permanent key
});

// Issue a grant — the consumer uses grant.token as their tunnel token
const grant = await grants.create({
  scope: "workshop-2026",
  subject: "attendee-42",
  expiresInSeconds: 120,
});

// Revoke one subject (closes their active tunnel)...
await grants.revoke({ scope: "workshop-2026", subject: "attendee-42" });

// ...or nuke the entire scope
await grants.revoke({ scope: "workshop-2026" });
```

The consumer then connects like any other client, just with the grant token instead of the API key:

```sh
npx @mikkel-ol/yatsi <port> --domain tunnel.example.com --token <grant-token>
```

## Options reference

| CLI option    | Required | Default | Description                                |
| ------------- | -------- | ------- | ------------------------------------------ |
| `port`        | yes      | —       | Local port to expose (positional)          |
| `--domain`    | yes      | —       | Tunnel server domain                       |
| `--token`     | yes      | —       | API key or grant token (alias: `--apiKey`) |
| `--subdomain` | no       | random  | Desired subdomain for the tunnel           |
| `--secure`    | no       | `true`  | Connect to the server over `wss://`        |

`tunnel.start()` accepts the same options in camelCase and returns a `Tunnel`:

| Property  | Type            | Description                                 |
| --------- | --------------- | ------------------------------------------- |
| `url`     | `string`        | The public tunnel URL                       |
| `close()` | `() => void`    | Close the tunnel                            |
| `closed`  | `Promise<void>` | Resolves once the tunnel is fully torn down |

## Server

There is no hosted YATSI service — that's a feature. Deploy your own server (Docker image included) on any box with a wildcard DNS record. See the [server setup guide](https://github.com/mikkel-ol/yatsi#server-setup).
