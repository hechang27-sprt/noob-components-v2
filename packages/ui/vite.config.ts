import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vitest/config";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    vueJsx(),
    dts({ tsconfigPath: "./tsconfig.build.json" }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
      cssFileName: "style",
    },
    rolldownOptions: {
      external: [
        "@noob-naive-ui/i18n",
        "es-toolkit",
        "naive-ui",
        "vue",
        "vue-i18n",
        "@noob-naive-ui/registry",
      ],
    },
  },
  resolve: {
    alias: [
      {
        find: "~/ui",
        replacement: resolve(__dirname, "src"),
      },
      {
        find: /^@noob-naive-ui\/i18n$/,
        replacement: resolve(__dirname, "../i18n/src/index.ts"),
      },
      {
        find: /^@noob\/i18n$/,
        replacement: resolve(__dirname, "../i18n/src/index.ts"),
      },
      {
        find: /^@noob-naive-ui\/registry$/,
        replacement: resolve(__dirname, "../registry/src/index.ts"),
      },
      {
        find: /^@noob\/registry$/,
        replacement: resolve(__dirname, "../registry/src/index.ts"),
      },
    ],
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
