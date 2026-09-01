import { resolve } from "node:path";

import vueJsxVapor from "vue-jsx-vapor/vite";
import { defineConfig } from "vitest/config";
import { dtsForBuild } from "@noob/tooling-vite";

export default defineConfig({
  plugins: [
    vueJsxVapor({ interop: true, macros: true }),
    dtsForBuild({
      tsconfig: "./tsconfig.build.json",
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
      external: [
        "@noob-naive-ui/admin",
        "@noob-naive-ui/i18n",
        "pinia",
        "vue",
        "vue-router",
        "zod",
      ],
    },
  },
  resolve: {
    // Vite 8 reads tsconfig.json paths — replaces manual JS/TS aliases.
    tsconfigPaths: true,
    // CSS imports need explicit aliases (tsconfigPaths only handles JS/TS).
    alias: [
      {
        find: "@noob-naive-ui/ui/style.css",
        replacement: resolve(import.meta.dirname, "../ui/src/style.css"),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      include: ["src/**/*.{ts,tsx,vue}"],
    },
  },
});
