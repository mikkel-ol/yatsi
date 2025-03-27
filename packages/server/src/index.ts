import type { z } from "zod";
import { envVariables } from "./config.js";

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envVariables> {}
  }
}

export * from "./server.js";
