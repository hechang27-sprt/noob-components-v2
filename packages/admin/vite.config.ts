import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tailwindcss(), vueJsx()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
      cssFileName: "style",
    },
    rollupOptions: {
      external: [
        "@noob-naive-ui/ui",
        "naive-ui",
        "pinia",
        "pro-naive-ui",
        "vue",
        "zod",
      ],
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
