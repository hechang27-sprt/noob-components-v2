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
        replacement: resolve(__dirname, "../ui/src/style.css"),
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
