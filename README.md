# YATSI

**Yet Another Tunneling Service Implementation.** Yes, the world has plenty of tunneling services. This one is yours.

YATSI exposes a local HTTP, SSE, or WebSocket service through a temporary public URL. No accounts, no dashboards, no "you've reached your free tier limit" emails at 2 AM — you host the server, you own the domain, you hand out the keys.

The pitch is simple: **host the server somewhere, then use the client to get a publicly accessible URL. Simple as that.**

```sh
npx @mikkel-ol/yatsi <port> --domain tunnel.example.com --token <your-api-key>
# ✔ Tunnel ready at: https://brave-toaster.tunnel.example.com
```

Everything hitting that URL is forwarded to `localhost:<port>` — plain HTTP, streaming responses, Server-Sent Events, and WebSockets included.

## Table of contents

- [How it works](#how-it-works)
- [Server setup](#server-setup)
- [Client usage](#client-usage)
- [Tunnel grants](#tunnel-grants)
- [Configuration reference](#configuration-reference)
- [Limitations](#limitations)
- [Development](#development)

## How it works

```
   Browser ──▶ https://brave-toaster.tunnel.example.com
                          │
                          ▼
               ┌─────────────────────┐
               │    YATSI server     │   your box, your domain
               └─────────────────────┘
                          │  one WebSocket connection
                          ▼
               ┌─────────────────────┐
               │    YATSI client     │──▶ localhost:4200
               └─────────────────────┘
```

The client opens a single outbound WebSocket to the server and authenticates with an API key. The server assigns a subdomain (a random two-word slug, or one you pick) and forwards all public traffic for that subdomain back through the tunnel to your local port. When the client disconnects, the URL dies with it.

## Server setup

### 1. Point DNS at your server

You need a wildcard, since every tunnel gets its own subdomain:

```
tunnel.example.com     A  →  <server IP>
*.tunnel.example.com   A  →  <server IP>
```

### 2. Run the server

With Docker:

```sh
docker build -t yatsi .
docker run -p 3000:3000 \
  -e DOMAIN=tunnel.example.com \
  -e API_KEY=$(openssl rand -base64 32) \
  yatsi
```

Or straight from the repo:

```sh
pnpm install && pnpm build
DOMAIN=tunnel.example.com API_KEY=replace-me \
  pnpm --filter @mikkel-ol/yatsi-server start
```

`DOMAIN` and `API_KEY` are the only required settings. YATSI intentionally ships with no built-in provider domain — bring your own.

### 3. Terminate TLS in front

The server itself speaks plain HTTP/WS. Put a reverse proxy (Caddy, Traefik, nginx) with a wildcard certificate for `*.tunnel.example.com` in front of it, and leave `SECURE=true` (the default) so tunnel URLs are generated as `https://`. If you skip TLS entirely, set `SECURE=false`.

That's the whole server story. One process, one env file, done.

## Client usage

### CLI

```sh
npx @mikkel-ol/yatsi <port> --domain tunnel.example.com --token <api-key>
```

Want a predictable URL? Ask for a subdomain:

```sh
npx @mikkel-ol/yatsi <port> --domain tunnel.example.com --token <api-key> --subdomain demo
# ✔ Tunnel ready at: https://demo.tunnel.example.com
```

### Library

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

## Configuration reference

### Server environment variables

| Variable    | Required | Default | Description                                               |
| ----------- | -------- | ------- | --------------------------------------------------------- |
| `DOMAIN`    | yes      | —       | Wildcard DNS domain routed to the server                  |
| `API_KEY`   | yes      | —       | Permanent key for opening tunnels and managing grants     |
| `PORT`      | no       | `3000`  | Port the server listens on                                |
| `SECURE`    | no       | `true`  | Generate `https://` tunnel URLs (TLS terminated upstream) |
| `LOG_LEVEL` | no       | `info`  | Log verbosity                                             |

### Client CLI options

| Option        | Required | Default | Description                                |
| ------------- | -------- | ------- | ------------------------------------------ |
| `port`        | yes      | —       | Local port to expose (positional)          |
| `--domain`    | yes      | —       | Tunnel server domain                       |
| `--token`     | yes      | —       | API key or grant token (alias: `--apiKey`) |
| `--subdomain` | no       | random  | Desired subdomain for the tunnel           |
| `--secure`    | no       | `true`  | Connect to the server over `wss://`        |

The library's `tunnel.start()` accepts the same options in camelCase.

## Limitations

- **Single instance.** Active tunnels and grants live in memory in one server process. Multiple replicas and shared state are unsupported until scale demands it — see [docs/adr/0001](docs/adr/0001-single-instance-runtime-state.md).
- **Ephemeral by design.** Server restarts drop all active tunnels and outstanding grants.
- YATSI forwards traffic; it attaches no meaning to it. What a tunnel exposes is the consuming application's business.

## Development

This is a pnpm + Turborepo monorepo:

```
packages/client   @mikkel-ol/yatsi         CLI + library
packages/server   @mikkel-ol/yatsi-server  the tunnel server
shared            @mikkel-ol/shared        protocol types and helpers
```

```sh
pnpm install
pnpm build   # build all packages
pnpm dev     # watch mode
pnpm test    # transport integration suite (HTTP, SSE, WebSocket)
```
