import { randomBytes } from "crypto";
import type { TunnelGrant } from "@mikkel-ol/shared";
import type { WebSocket } from "ws";

interface GrantRecord extends TunnelGrant {
  consumed: boolean;
  active?: {
    slug: string;
    ws: WebSocket;
  };
}

const GRANTS = new Map<string, GrantRecord>();

export function createGrant(scope: string, subject: string, expiresInSeconds: number): TunnelGrant {
  cleanupExpired();
  const token = randomBytes(32).toString("base64url");
  const grant: GrantRecord = {
    token,
    scope,
    subject,
    expiresAt: Date.now() + expiresInSeconds * 1000,
    consumed: false,
  };
  GRANTS.set(token, grant);
  return publicGrant(grant);
}

export function canUseTunnelToken(token: string | null): boolean {
  if (!token) return false;
  if (token === process.env.API_KEY) return true;

  const grant = GRANTS.get(token);
  return !!grant && !grant.consumed && grant.expiresAt > Date.now();
}

export function consumeGrant(
  token: string,
  active: { slug: string; ws: WebSocket },
): Pick<TunnelGrant, "scope" | "subject"> | undefined {
  if (token === process.env.API_KEY) return undefined;

  const grant = GRANTS.get(token);
  if (!grant || grant.consumed || grant.expiresAt <= Date.now()) {
    throw new Error("Tunnel grant is invalid, expired, or already consumed");
  }

  grant.consumed = true;
  grant.active = active;
  return { scope: grant.scope, subject: grant.subject };
}

export function revokeGrants(scope: string, subject?: string): number {
  let revoked = 0;

  for (const [token, grant] of GRANTS) {
    if (grant.scope !== scope || (subject && grant.subject !== subject)) continue;

    grant.active?.ws.close(4003, "Tunnel grant revoked");
    GRANTS.delete(token);
    revoked += 1;
  }

  return revoked;
}

export function releaseGrant(token: string | null): void {
  if (!token || token === process.env.API_KEY) return;
  const grant = GRANTS.get(token);
  if (grant) grant.active = undefined;
}

function cleanupExpired(): void {
  const now = Date.now();
  for (const [token, grant] of GRANTS) {
    if (!grant.consumed && grant.expiresAt <= now) GRANTS.delete(token);
  }
}

function publicGrant(grant: GrantRecord): TunnelGrant {
  return {
    token: grant.token,
    scope: grant.scope,
    subject: grant.subject,
    expiresAt: grant.expiresAt,
  };
}
