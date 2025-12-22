import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "package/index.ts",
    data_types: "package/data_types/pg_types.ts",
    definition: "package/definition.ts",
    types: "package/types.ts",
  },
  format: ["esm", "cjs"],
  outDir: "./dist",
  clean: true,
  dts: true,
});
