import { resolve } from "node:path";

import vueJsxVapor from "vue-jsx-vapor/vite";
import { defineConfig } from "vitest/config";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [vueJsxVapor({ interop: true, macros: true }), dts({
      tsconfigPath: "./tsconfig.build.json",
      // Monorepo: entries are package src; deps resolve via tsconfig
      // paths from source (no prebuilt dep dist needed).
      entryRoot: "./src",
      // Keep emitted specifiers verbatim (@noob-naive-ui/*) instead of
      // rewriting paths targets into relative sibling-source imports.
      pathsToAliases: false,
    })],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rolldownOptions: {
      external: ["vue", "vue-i18n", "zod",
      "@noob-naive-ui/registry",
    ],
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
