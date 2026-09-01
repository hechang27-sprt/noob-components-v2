import { resolve } from "node:path";

import vueI18n from "@intlify/unplugin-vue-i18n/vite";
import tailwindcss from "@tailwindcss/vite";
import vueJsxVapor from "vue-jsx-vapor/vite";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import {
  createJsonLocaleTypesPlugin,
  dtsForBuild,
  externalFromPackageJson,
} from "@noob/tooling-vite";

export default defineConfig({
  plugins: [
    // Generates src/locales/locale-types.generated.ts from the locale JSON
    // resources before the module graph (and the declaration emitter) runs.
    createJsonLocaleTypesPlugin({
      dir: resolve(import.meta.dirname, "src/locales"),
      outFile: resolve(
        import.meta.dirname,
        "src/locales/locale-types.generated.ts",
      ),
    }),
    tailwindcss(),
    vue(),
    vueJsxVapor({ interop: true, macros: true }),
    vueI18n({
      include: [resolve(import.meta.dirname, "src/locales/**")],
      exclude: [
        resolve(import.meta.dirname, "src/locales/locale-types.generated.ts"),
        resolve(import.meta.dirname, "src/locales/locale-types.generated.d.ts"),
      ],
    }),
    dtsForBuild({
      tsconfig: "./tsconfig.json",
    }),
  ],
  oxc: {
    exclude: [/\.js$/, /\.d\.[cm]?ts$/],
  },
  build: {
    cssMinify: false,
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      formats: ["es"],
      fileName: (_format: string, name: string) =>
        name.endsWith(".d") ? `${name}.ts` : `${name}.js`,
      cssFileName: "style",
    },
    rolldownOptions: {
      external: externalFromPackageJson(
        resolve(import.meta.dirname, "package.json"),
      ),
    },
  },
  resolve: {
    // Vite 8 reads tsconfig.json paths — replaces manual JS/TS aliases.
    tsconfigPaths: true,
    // CSS imports need explicit aliases (tsconfigPaths only handles JS/TS).
    alias: [
      {
        find: "@noob-naive-ui/ui/style.css",
        replacement: resolve(import.meta.dirname, "../ui/src/style.css"),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      include: ["src/**/*.{ts,tsx,vue}"],
    },
  },
});
