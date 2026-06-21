import { z } from "zod";

export const config = z.object({
  token: z.string(),
  secure: z.boolean().default(true),
  domain: z.string().min(1),
  subdomain: z.string().optional(),
  port: z.number().int().positive(),
});

export type Config = z.input<typeof config>;
