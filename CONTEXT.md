# YATSI Tunnel Service

YATSI exposes a local HTTP, Server-Sent Events, and WebSocket service through a public URL. It is transport infrastructure.

## Language

**Tunnel**:
A public route that forwards traffic to one local service.

**Tunnel Client**:
A process that connects a local service to the **Tunnel Server**.

**Tunnel Server**:
The public rendezvous point that assigns tunnel URLs and forwards traffic.

**Tunnel URL**:
The public address assigned to one active **Tunnel**.

**Tunnel Grant**:
A short-lived credential authorizing a consumer to open a limited tunnel without possessing the issuer's permanent API key.

**Grant Scope**:
An opaque issuer-defined value grouping related **Tunnel Grants** for collective revocation.

**Grant Subject**:
An opaque issuer-defined value identifying the consumer authorized by one **Tunnel Grant**.

**Grant Control API**:
The authenticated YATSI interface used by trusted consumers to issue and revoke opaque **Tunnel Grants**.

**Permanent API Key**:
The deployment credential that authorizes trusted clients to open ordinary tunnels and use the **Grant Control API**.

## Relationships

- A **Tunnel Client** opens one or more **Tunnels**
- A **Tunnel** exposes exactly one local service through one **Tunnel URL**
- A **Tunnel** transparently carries HTTP streaming and WebSocket traffic required by local development servers
- A **Tunnel Server** coordinates many active **Tunnels**
- A valid **Tunnel Grant** may authorize a **Tunnel Client** to open a limited **Tunnel**
- A **Tunnel Grant** may be restricted to one **Grant Scope**, one **Grant Subject**, and one initial tunnel connection
- A **Tunnel Grant** has a bounded issuance lifetime independent of its connected tunnel lifetime
- YATSI creates and stores opaque **Tunnel Grants** through the **Grant Control API**
- YATSI consumes a **Tunnel Grant** atomically when its initial tunnel connects
- One **Permanent API Key** authorizes both ordinary tunnel creation and grant control operations
- A grant issuer may revoke one **Grant Subject** or one entire **Grant Scope**
- Revoking a **Grant Subject** closes its active **Tunnel**

## Example Dialogue

> **Dev:** "Does YATSI know that a tunnel exposes a workshop micro-frontend?"
> **Domain expert:** "No. YATSI only forwards traffic; the consuming application owns the meaning of that service."

## Flagged Ambiguities

- YATSI treats grant scope and subject values as opaque; consumers assign their domain meaning.
