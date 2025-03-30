import type { z } from "zod";
import { EnvironmentVariables } from "./config.js";

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof EnvironmentVariables> {}
  }
}

export * from "./server/index.js";
