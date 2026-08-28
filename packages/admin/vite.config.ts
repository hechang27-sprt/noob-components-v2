import { resolve } from "node:path";

import vueI18n from "@intlify/unplugin-vue-i18n/vite";
import tailwindcss from "@tailwindcss/vite";
import vueJsxVapor from "vue-jsx-vapor/vite";
import { defineConfig } from "vitest/config";
import dts from "unplugin-dts/vite";

import { createJsonLocaleTypesPlugin } from "../../tooling/vite/json-locale-types";

export default defineConfig({
  plugins: [
    // Generates src/locales/locale-types.generated.ts from the locale JSON
    // resources before the module graph (and the declaration emitter) runs.
    createJsonLocaleTypesPlugin({
      dir: resolve(__dirname, "src/locales"),
      outFile: resolve(__dirname, "src/locales/locale-types.generated.ts"),
    }),
    tailwindcss(),
    vueJsxVapor({ interop: true, macros: true }),
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
        "@noob-naive-ui/i18n",
        "@noob-naive-ui/ui",
        "naive-ui",
        "pinia",
        "pro-naive-ui",
        "vue",
        "vue-i18n",
        "zod",
      "@noob-naive-ui/registry",
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
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      include: ["src/**/*.{ts,tsx,vue}"],
    },
  },
});
