import { resolve } from "node:path";

import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vitest/config";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [vueJsx(), dts({ tsconfigPath: "./tsconfig.build.json" })],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rolldownOptions: {
      external: ["@noob-naive-ui/admin", "pinia", "vue", "vue-router", "zod"],
    },
  },
  resolve: {
    alias: [
      {
        find: /^@noob-naive-ui\/admin$/,
        replacement: resolve(__dirname, "../admin/src/index.ts"),
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
