import { resolve } from "node:path";

import vueJsxVapor from "vue-jsx-vapor/vite";
import { defineConfig } from "vitest/config";
import { dtsForBuild } from "@noob/tooling-vite/dts-build";

export default defineConfig({
  plugins: [
    vueJsxVapor({ interop: true, macros: true }),
    dtsForBuild({
      tsconfig: "./tsconfig.build.json",
      build: true,
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
      external: ["vue", "vue-i18n", "zod", "@noob-naive-ui/registry"],
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
