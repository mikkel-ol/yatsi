import { z } from "zod";

export interface CreateGrantRequest {
  scope: string;
  subject: string;
  expiresInSeconds?: number;
}

export interface TunnelGrant {
  token: string;
  scope: string;
  subject: string;
  expiresAt: number;
}

export interface RevokeGrantRequest {
  scope: string;
  subject?: string;
}

const createGrantRequest = z.object({
  scope: z.string().min(1).max(200),
  subject: z.string().min(1).max(200),
  expiresInSeconds: z.number().int().positive().max(300).default(60),
});

export interface GrantClientConfig {
  serverUrl: string;
  apiKey: string;
}

export function createGrantClient(config: GrantClientConfig) {
  const endpoint = new URL("/_yatsi/grants", ensureProtocol(config.serverUrl));

  return {
    async create(request: CreateGrantRequest): Promise<TunnelGrant> {
      const body = createGrantRequest.parse(request);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers(config.apiKey),
        body: JSON.stringify(body),
      });

      return parseResponse<TunnelGrant>(response);
    },

    async revoke(request: RevokeGrantRequest): Promise<void> {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: headers(config.apiKey),
        body: JSON.stringify(request),
      });

      await parseResponse(response);
    },
  };
}

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function ensureProtocol(url: string) {
  return url.includes("://") ? url : `https://${url}`;
}

async function parseResponse<T = unknown>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : `YATSI request failed with ${response.status}`,
    );
  }
  return body as T;
}
