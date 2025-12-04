import { z, ZodSchema, type ParseReturnType, type SafeParseReturnType } from "zod";

export const CreateTunnelParams = z
  .object({
    token: z.coerce.string(),
    port: z.coerce.number().int().positive(),
    subdomain: z.coerce.string().optional(),
  })
  .strict();

export type CreateTunnelParams = z.input<typeof CreateTunnelParams>;
export type Slug = CreateTunnelParams["subdomain"];

export const HubParams = z
  .object({
    mode: z.literal("hub").or(z.literal("proxy")),
  })
  .strict();

export type HubParams = z.input<typeof HubParams>;

export function parseParams<T>(searchParams: URLSearchParams, schema: ZodSchema<T>) {
  return parse(searchParams, schema, "parse") as z.input<ZodSchema<T>>;
}

export function safeParseParams<T>(searchParams: URLSearchParams, schema: ZodSchema<T>) {
  return parse(searchParams, schema, "safeParse") as SafeParseReturnType<T, T>;
}

function parse<T>(searchParams: URLSearchParams, schema: ZodSchema<T>, method: "parse" | "safeParse") {
  const data = {} as any;

  for (const [key, value] of searchParams.entries()) {
    data[key] = value;
  }

  return schema[method](data);
}
