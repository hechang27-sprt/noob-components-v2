import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import vueDevTools from "vite-plugin-vue-devtools";
import { createWorkspaceVueI18nPlugin } from "../../tooling/vite/vue-i18n";
import { createJsonLocaleTypesWatcherPlugin } from "../../tooling/vite/json-locale-types";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    vueJsx(),
    vueDevTools(),
    // Optional monorepo tooling for source-locale transforms and HMR.
    // Without it, the dev server and production build must still work; built
    // package consumers configure nothing.
    createWorkspaceVueI18nPlugin(),
    // Regenerates the admin package's generated locale types when its JSON
    // resources change during dev, so tsserver/watch-mode typechecks stay
    // fresh without an admin rebuild.
    createJsonLocaleTypesWatcherPlugin({
      dir: resolve(__dirname, "../../packages/admin/src/locales"),
      outFile: resolve(
        __dirname,
        "../../packages/admin/src/locales/locale-types.generated.ts",
      ),
    }),
  ],
  resolve: {
    alias: [
      {
        find: "~/demo",
        replacement: resolve(__dirname, "src/"),
      },
      {
        find: "~/admin",
        replacement: resolve(__dirname, "../../packages/admin/src/"),
      },
      {
        find: "~/ui",
        replacement: resolve(__dirname, "../../packages/ui/src/"),
      },
      {
        find: /^~\/i18n\//,
        replacement: resolve(__dirname, "../../packages/i18n/src/"),
      },
      {
        find: "~/registry",
        replacement: resolve(__dirname, "../../packages/registry/src/"),
      },
      {
        find: "~/admin-vue-router",
        replacement: resolve(__dirname, "../../packages/admin-vue-router/src/"),
      },
      {
        find: /^~\/prototype-i18n-verification\//,
        replacement: resolve(
          __dirname,
          "../../packages/prototype-i18n-verification/src/",
        ),
      },
      {
        find: /^@noob-naive-ui\/admin-vue-router$/,
        replacement: resolve(
          __dirname,
          "../../packages/admin-vue-router/src/index.ts",
        ),
      },
      {
        find: /^@noob\/admin-vue-router$/,
        replacement: resolve(
          __dirname,
          "../../packages/admin-vue-router/src/index.ts",
        ),
      },
      {
        find: /^@noob-naive-ui\/i18n$/,
        replacement: resolve(__dirname, "../../packages/i18n/src/index.ts"),
      },
      {
        find: /^@noob\/i18n$/,
        replacement: resolve(__dirname, "../../packages/i18n/src/index.ts"),
      },
      {
        find: /^@noob-naive-ui\/registry$/,
        replacement: resolve(__dirname, "../../packages/registry/src/index.ts"),
      },
      {
        find: /^@noob\/registry$/,
        replacement: resolve(__dirname, "../../packages/registry/src/index.ts"),
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
        find: /^@noob\/admin$/,
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
        find: /^@noob\/prototype-i18n-verification$/,
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
      {
        find: /^@noob\/ui$/,
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
