# YATSI

YATSI exposes local HTTP, Server-Sent Events, and WebSocket services through
temporary public URLs. It is a generic tunnel service; workshop behavior lives
in consumers such as `mf-ws-builder`.

## Server

YATSI requires an explicit domain and API key:

```sh
pnpm install
pnpm build
DOMAIN=tunnel.example.com API_KEY=replace-me PORT=3000 SECURE=true \
  pnpm --filter @mikkel-ol/yatsi-server start
```

`DOMAIN` is the wildcard DNS domain routed to the server. YATSI intentionally
has no built-in provider domain.

## Client

Expose a local service with the permanent API key:

```sh
yatsi 4200 --domain tunnel.example.com --token replace-me
```

Library usage:

```ts
import { tunnel } from "@mikkel-ol/yatsi";

const activeTunnel = await tunnel.start({
  port: 4200,
  domain: "tunnel.example.com",
  secure: true,
  token: process.env.YATSI_API_KEY!,
});

console.log(activeTunnel.url);
```

Trusted consumers may use `createGrantClient` to issue opaque, single-use,
short-lived tunnel grants scoped to their own domain concepts.

Run the transport integration suite with:

```sh
pnpm test
```
