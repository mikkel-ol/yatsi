import { z } from "zod";

export const Params = z
  .object({
    token: z.string(),
    port: z.number().int().positive(),
    subdomain: z.string().optional(),
    type: z
      .union([z.literal("host"), z.literal("mf")])
      .default("mf")
      .optional(),
  })
  .strict();

export type Params = z.infer<typeof Params>;

export type Slug = z.infer<typeof Params>["subdomain"];

export function parseParams(searchParams: URLSearchParams) {
  const data = {} as any;

  for (const [key, value] of searchParams.entries()) {
    data[key] = isNaN(Number(value)) ? value : Number(value);
  }

  return Params.parse(data);
}

export function safeParseParams(searchParams: URLSearchParams) {
  const data = {} as any;

  for (const [key, value] of searchParams.entries()) {
    data[key] = isNaN(Number(value)) ? value : Number(value);
  }

  return Params.safeParse(data);
}
