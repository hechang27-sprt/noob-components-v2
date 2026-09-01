import { resolve } from "node:path";

import { defineConfig } from "vitest/config";
import { dtsForBuild, externalFromPackageJson } from "@noob/tooling-vite";

export default defineConfig({
  plugins: [
    dtsForBuild({
      tsconfig: "./tsconfig.json",
    }),
  ],
  oxc: {
    // Keep generated declarations intact: vite's oxc transform would
    // otherwise strip the virtual .d.ts modules served by rolldown-plugin-dts.
    exclude: [/\.js$/, /\.d\.[cm]?ts$/],
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      formats: ["es"],
      fileName: (_format: string, name: string) =>
        name.endsWith(".d") ? `${name}.ts` : `${name}.js`,
    },
    rolldownOptions: {
      external: externalFromPackageJson(
        resolve(import.meta.dirname, "package.json"),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      include: ["src/**/*.{ts,tsx,vue}"],
    },
  },
});
