import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";

import vue from "@vitejs/plugin-vue";
import vueJsxVapor from "vue-jsx-vapor/vite";
import vueDevTools from "vite-plugin-vue-devtools";
import { hmrPatchServer } from "@noob/tooling-vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss({ optimize: { minify: true } }),
    vue(),
    vueJsxVapor({ interop: true, macros: true }),
    vueDevTools(),
    hmrPatchServer({
      root: resolve(import.meta.dirname, "../.."),
      targets: [
        {
          patchId: "uiSource",
          file: "packages/ui/src/components/hmr-test/root.tsx",
          patches: [
            { find: '"ui:base"', replace: '"ui:edited"' },
            { find: "bg-amber-100", replace: "bg-sky-100" },
          ],
        },
        {
          patchId: "uiLocale",
          file: "packages/ui/src/components/hmr-test/root.tsx",
          patches: [
            {
              find: 'HMR_TEST_STATUS = "base"',
              replace: 'HMR_TEST_STATUS = "edited"',
            },
            {
              file: "packages/ui/src/locales/HMRTest.json",
              find: '"status": "base"',
              replace: '"status": "edited"',
            },
          ],
        },
        {
          patchId: "adminSource",
          file: "packages/admin/src/components/hmr-test/root.tsx",
          patches: [
            { find: '"admin:base"', replace: '"admin:edited"' },
            { find: "bg-lime-100", replace: "bg-pink-100" },
          ],
        },
        {
          patchId: "adminLocale",
          file: "packages/admin/src/components/hmr-test/root.tsx",
          patches: [
            {
              find: 'HMR_TEST_STATUS = "base"',
              replace: 'HMR_TEST_STATUS = "edited"',
            },
            {
              file: "packages/admin/src/locales/HMRTest.json",
              find: '"status": "base"',
              replace: '"status": "edited"',
            },
          ],
        },
        {
          patchId: "demoSource",
          file: "apps/demo/src/components/hmr-test/root.tsx",
          patches: [
            { find: '"demo:base"', replace: '"demo:edited"' },
            { find: "bg-emerald-100", replace: "bg-orange-100" },
          ],
        },
        {
          patchId: "demoLocale",
          file: "apps/demo/src/components/hmr-test/root.tsx",
          patches: [
            {
              find: 'HMR_TEST_STATUS = "base"',
              replace: 'HMR_TEST_STATUS = "edited"',
            },
            {
              file: "apps/demo/src/locales/demo.json",
              find: '"status": "base"',
              replace: '"status": "edited"',
            },
          ],
        },
      ],
    }),
  ],
  build: {
    cssMinify: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          minSize: 50000, // 50KB minimum chunk size
          groups: [
            {
              name: "vue",
              test: /[\\/]node_modules[\\/]vue[\\/]/,
              priority: 20,
            },
            {
              name: "vue-i18n",
              test: /[\\/]node_modules[\\/]vue-i18n[\\/]/,
              priority: 20,
            },
            {
              name: "vue-router",
              test: /[\\/]node_modules[\\/]vue-router[\\/]/,
              priority: 20,
            },
            {
              name: "naive-ui",
              test: /[\\/]node_modules[\\/]naive-ui[\\/]/,
              priority: 20,
            },
            {
              name: "pro-naive-ui",
              test: /[\\/]node_modules[\\/]pro-naive-ui[\\/]/,
              priority: 20,
            },
            {
              name: "pinia",
              test: /[\\/]node_modules[\\/]pinia[\\/]/,
              priority: 20,
            },
            {
              name: "vendor",
              test: /[\\/]node_modules[\\/]/,
              // Keep vendor at the same priority as the named groups; at a
              // lower priority rolldown folds its module set into whichever
              // group chunk references it and no vendor chunk is emitted.
              priority: 20,
            },
            {
              // Workspace libs resolve FROM SOURCE via tsconfigPaths
              // (packages/<pkg>/src/...), so a node_modules-anchored test
              // never matches; also match the package directories. Declaring
              // this group LAST keeps rolldown's tie handling from absorbing
              // the earlier named chunks.
              name: "@noob-naive-ui",
              test: /[\\/](?:node_modules[\\/](?:@noob|@noob-naive-ui)|packages[\\/](?:registry|i18n|ui|admin|admin-vue-router))[\\/]/,
              priority: 20,
              minSize: 0,
            },
          ],
        },
      },
    },
  },
  resolve: {
    // Vite 8 reads tsconfig.json paths — replaces manual JS/TS aliases.
    tsconfigPaths: true,
    // Framework singletons must be single-instance in the bundle: the app's
    // direct deps and the published library dists can otherwise resolve
    // different physical copies (pnpm peer-context variants), which breaks
    // injection keys across the boundary (e.g. vue-router RouterView).
    dedupe: [
      "vue",
      "vue-router",
      "pinia",
      "vue-i18n",
      "naive-ui",
      "pro-naive-ui",
    ],
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
