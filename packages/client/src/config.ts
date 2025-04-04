import { DEFAULT_DOMAIN } from "@mikkel-ol/shared";
import { z } from "zod";

export const config = z.object({
  token: z.string(),
  secure: z.boolean().default(true),
  domain: z.string().default(DEFAULT_DOMAIN),
  subdomain: z.string().optional(),
  port: z.number().int().positive(),
});

export type Config = z.input<typeof config>;
