import { resolve } from "node:path";

import { defineConfig } from "vitest/config";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rolldownOptions: {
      external: ["@noob-naive-ui/admin", "vue", "vue-router", "zod"],
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
