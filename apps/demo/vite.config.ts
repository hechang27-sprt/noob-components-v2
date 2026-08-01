import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import vueDevTools from "vite-plugin-vue-devtools";
import { createWorkspaceVueI18nPlugin } from "../../tooling/vite/vue-i18n";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    vueJsx(),
    vueDevTools(),
    // Workspace-wide locale precompilation for source-consuming builds;
    // built-package consumers configure nothing.
    createWorkspaceVueI18nPlugin(),
  ],
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
        find: /^@noob-naive-ui\/prototype-i18n-verification$/,
        replacement: resolve(
          __dirname,
          "../../packages/prototype-i18n-verification/src/index.ts",
        ),
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
