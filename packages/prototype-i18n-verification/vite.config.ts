import { resolve } from "node:path";

import vueI18n from "@intlify/unplugin-vue-i18n/vite";
import vue from "@vitejs/plugin-vue";
import vueJsxVapor from "vue-jsx-vapor/vite";
import { defineConfig } from "vite";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [
    vue(),
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
    },
    rolldownOptions: {
      external: ["vue", "vue-i18n"],
    },
  },
});
