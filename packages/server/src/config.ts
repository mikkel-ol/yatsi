import { DEFAULT_DOMAIN } from "@mikkel-ol/shared";
import { z } from "zod";

export const envVariables = z.object({
  DOMAIN: z.string().default(DEFAULT_DOMAIN),
  PORT: z.string().default("3000"),
});

envVariables.parse(process.env);
