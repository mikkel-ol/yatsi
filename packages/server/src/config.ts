import { DEFAULT_DOMAIN } from "@mikkel-ol/shared";
import { z } from "zod";

export const EnvironmentVariables = z.object({
  DOMAIN: z.string().default(DEFAULT_DOMAIN),
  PORT: z.string().default("3000"),
});

const envVars = EnvironmentVariables.parse(process.env);

process.env = {
  ...process.env,
  ...envVars,
};
