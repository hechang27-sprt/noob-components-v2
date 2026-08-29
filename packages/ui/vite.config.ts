import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import vueJsxVapor from "vue-jsx-vapor/vite";
import { defineConfig } from "vitest/config";
import dts from "unplugin-dts/vite";
import vueI18n from "@intlify/unplugin-vue-i18n/vite";
import { createJsonLocaleTypesPlugin } from "../../tooling/vite/json-locale-types";

export default defineConfig({
  plugins: [
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
    // Vite 8 reads tsconfig.json paths — replaces manual JS/TS aliases.
    tsconfigPaths: true,
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
