import { z } from "zod";

export const CreateGrantRequest = z.object({
  scope: z.string().min(1).max(200),
  subject: z.string().min(1).max(200),
  expiresInSeconds: z.number().int().positive().max(300).default(60),
});

export type CreateGrantRequest = z.input<typeof CreateGrantRequest>;

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
