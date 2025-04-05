import type { Options } from "tsup";

export default {
  entry: ["./src/**/*.ts"],
  format: ["esm", "cjs"],
  dts: true,
  bundle: true,
  clean: true,
  external: [],
  splitting: false,
} satisfies Options;
