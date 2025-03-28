import { z } from "zod";

export const Params = z.object({
  token: z.string(),
  port: z.number().int().positive(),
  subdomain: z.string().optional(),
  type: z
    .union([z.literal("host"), z.literal("mf")])
    .default("mf")
    .optional(),
});

export type Params = z.infer<typeof Params>;

export type Slug = z.infer<typeof Params>["subdomain"];
