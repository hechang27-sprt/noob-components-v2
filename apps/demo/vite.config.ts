import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

import vue from "@vitejs/plugin-vue";
import vueJsxVapor from "vue-jsx-vapor/vite";
import vueDevTools from "vite-plugin-vue-devtools";
import { createWorkspaceVueI18nPlugin } from "@noob/tooling-vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    vueJsxVapor({ interop: true, macros: true }),
    vueDevTools(),
    // Optional monorepo tooling for source-locale transforms and HMR.
    // Without it, the dev server and production build must still work; built
    // package consumers configure nothing.
    createWorkspaceVueI18nPlugin(),
  ],
  build: {
    cssMinify: false,
  },
  resolve: {
    // Vite 8 reads tsconfig.json paths — replaces manual JS/TS aliases.
    tsconfigPaths: true,
    // CSS imports need explicit aliases (tsconfigPaths only handles JS/TS).
    alias: [
      {
        find: "@noob-naive-ui/admin/style.css",
        replacement: resolve(
          import.meta.dirname,
          "../../packages/admin/src/style.css",
        ),
      },
      {
        find: "@noob-naive-ui/ui/style.css",
        replacement: resolve(
          import.meta.dirname,
          "../../packages/ui/src/style.css",
        ),
      },
    ],
  },
  server: {
    fs: {
      allow: [resolve(import.meta.dirname, "../..")],
    },
  },
});
