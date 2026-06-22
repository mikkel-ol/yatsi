# @mikkel-ol/yatsi

YATSI stands for **Yet Another Tunneling Service Implementation**. It exposes a local HTTP, Server-Sent Events, or WebSocket service through a temporary public URL on a YATSI tunnel server.

This package provides the YATSI client CLI and library API.

## Installation

```sh
npm install @mikkel-ol/yatsi
```

## CLI

Start a tunnel to a local port:

```sh
npx yatsi 4200 --domain tunnel.example.com --token replace-me
```

Use `--subdomain` to request a specific subdomain:

```sh
npx yatsi 4200 --domain tunnel.example.com --token replace-me --subdomain my-app
```

By default the client connects with HTTPS/WSS. For a local or insecure tunnel server, pass `--no-secure`:

```sh
npx yatsi 4200 --domain localhost:3000 --token replace-me --no-secure
```

## Library

```ts
import { tunnel } from "@mikkel-ol/yatsi";

const activeTunnel = await tunnel.start({
  port: 4200,
  domain: "tunnel.example.com",
  secure: true,
  token: process.env.YATSI_API_KEY!,
});

console.log(activeTunnel.url);

process.on("SIGINT", () => {
  activeTunnel.close();
});
```

`tunnel.start` resolves when the tunnel server confirms the public URL. The returned tunnel includes:

- `url`: public tunnel URL
- `close()`: closes the tunnel connection
- `closed`: promise that resolves after the connection closes

## Grants

Trusted services can create short-lived, single-use tunnel grants with `createGrantClient`:

```ts
import { createGrantClient } from "@mikkel-ol/yatsi";

const grants = createGrantClient({
  serverUrl: "https://tunnel.example.com",
  apiKey: process.env.YATSI_API_KEY!,
});

const grant = await grants.create({
  scope: "preview",
  subject: "project-123",
  expiresInSeconds: 60,
});

console.log(grant.token);
```

Grants can also be revoked by scope and optional subject:

```ts
await grants.revoke({
  scope: "preview",
  subject: "project-123",
});
```

## Requirements

YATSI does not provide a hosted tunnel domain. You need access to a running YATSI server with a configured domain and API key.
