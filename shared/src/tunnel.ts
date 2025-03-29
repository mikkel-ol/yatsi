import { z } from "zod";

export const Params = z
  .object({
    pleasegivemea: z.literal("tunnel"),
    token: z.string(),
    port: z.number().int().positive(),
    subdomain: z.string().optional(),
    type: z.union([z.literal("host"), z.literal("mf")]).default("mf"),
  })
  .strict();

export type Params = z.input<typeof Params>;
export type Slug = Params["subdomain"];

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
