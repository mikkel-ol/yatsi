import { z } from "zod";

export const __INIT_PARAM__ = "__tunnel_init__";
export const __INIT_PARAM_VALUE__ = "1";

export const Params = z
  .object({
    [__INIT_PARAM__]: z.literal(__INIT_PARAM_VALUE__),
    token: z.coerce.string(),
    port: z.coerce.number().int().positive(),
    subdomain: z.coerce.string().optional(),
    type: z.union([z.literal("host"), z.literal("mf")]).default("mf"),
  })
  .strict();

export type Params = z.input<typeof Params>;
export type Slug = Params["subdomain"];

export function parseParams(searchParams: URLSearchParams) {
  return parse(searchParams, "parse");
}

export function safeParseParams(searchParams: URLSearchParams) {
  return parse(searchParams, "safeParse");
}

function parse(searchParams: URLSearchParams, method: "parse"): ReturnType<(typeof Params)["parse"]>;
function parse(searchParams: URLSearchParams, method: "safeParse"): ReturnType<(typeof Params)["safeParse"]>;
function parse(searchParams: URLSearchParams, method: "parse" | "safeParse") {
  const data = {} as any;

  for (const [key, value] of searchParams.entries()) {
    data[key] = value;
  }

  return Params[method](data);
}
