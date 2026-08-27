import { resolve } from "node:path";

import vueJsxVapor from "vue-jsx-vapor/vite";
import { defineConfig } from "vitest/config";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [vueJsxVapor({ interop: true, macros: true }), dts({ tsconfigPath: "./tsconfig.build.json" })],
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
    alias: [
      {
        find: /^@noob-naive-ui\/admin$/,
        replacement: resolve(__dirname, "../admin/src/index.ts"),
      },
      {
        find: /^@noob-naive-ui\/i18n$/,
        replacement: resolve(__dirname, "../i18n/src/index.ts"),
      },
      {
        find: "@noob-naive-ui/ui/style.css",
        replacement: resolve(__dirname, "../ui/src/style.css"),
      },
      {
        find: /^@noob-naive-ui\/ui$/,
        replacement: resolve(__dirname, "../ui/src/index.ts"),
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
