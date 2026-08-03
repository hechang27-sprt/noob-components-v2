import { resolve } from "node:path";

import vueI18n from "@intlify/unplugin-vue-i18n/vite";
import tailwindcss from "@tailwindcss/vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vitest/config";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    vueJsx(),
    vueI18n({
      include: [resolve(__dirname, "src/locales/**")],
    }),
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
        "@vicons/ionicons5",
        "@noob-naive-ui/ui",
        "naive-ui",
        "pinia",
        "pro-naive-ui",
        "vue",
        "vue-i18n",
        "zod",
      ],
    },
  },
  resolve: {
    alias: [
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
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      include: ["src/**/*.{ts,tsx,vue}"],
    },
  },
});
