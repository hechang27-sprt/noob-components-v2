import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [tailwindcss(), dts({ tsconfigPath: "./tsconfig.build.json" })],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
      cssFileName: "style",
    },
    rolldownOptions: {
      external: ["@noob-naive-ui/i18n", "naive-ui", "vue", "vue-i18n"],
    },
  },
});
