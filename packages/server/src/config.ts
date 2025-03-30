import { DEFAULT_DOMAIN, LOG_LEVEL } from "@mikkel-ol/shared";
import { z } from "zod";

export const EnvironmentVariables = z.object({
  DOMAIN: z.string().default(DEFAULT_DOMAIN),
  PORT: z.string().default("3000"),
  LOG_LEVEL: z.nativeEnum(LOG_LEVEL).default(LOG_LEVEL.INFO),
  API_KEY: z.string().default("changeme"),
});

const envVars = EnvironmentVariables.parse(process.env);

process.env = {
  ...process.env,
  ...envVars,
};
