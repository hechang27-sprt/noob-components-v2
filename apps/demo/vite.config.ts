import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import vueDevTools from "vite-plugin-vue-devtools";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), vue(), vueJsx(), vueDevTools()],
  resolve: {
    alias: [
      {
        find: /^@noob-naive-ui\/admin-vue-router$/,
        replacement: resolve(
          __dirname,
          "../../packages/admin-vue-router/src/index.ts",
        ),
      },
      {
        find: "@noob-naive-ui/admin/style.css",
        replacement: resolve(__dirname, "../../packages/admin/src/style.css"),
      },
      {
        find: /^@noob-naive-ui\/admin$/,
        replacement: resolve(__dirname, "../../packages/admin/src/index.ts"),
      },
      {
        find: "@noob-naive-ui/ui/style.css",
        replacement: resolve(__dirname, "../../packages/ui/src/style.css"),
      },
      {
        find: /^@noob-naive-ui\/ui$/,
        replacement: resolve(__dirname, "../../packages/ui/src/index.ts"),
      },
    ],
  },
  server: {
    fs: {
      allow: [resolve(__dirname, "../..")],
    },
  },
});
