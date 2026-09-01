import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import vueJsxVapor from "vue-jsx-vapor/vite";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { dtsForBuild } from "@noob/tooling-vite/dts-build";
import vueI18n from "@intlify/unplugin-vue-i18n/vite";
import { createJsonLocaleTypesPlugin } from "@noob/tooling-vite/json-locale-types";

export default defineConfig({
  plugins: [
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
      tsconfig: "./tsconfig.build.json",
      build: true,
    }),
  ],
  oxc: {
    // Keep generated declarations intact: vite's oxc transform would
    // otherwise strip the virtual .d.ts modules served by rolldown-plugin-dts.
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
      external: [
        "@noob-naive-ui/i18n",
        "es-toolkit",
        "naive-ui",
        "vue",
        "vue-i18n",
        "@noob-naive-ui/registry",
      ],
    },
  },
  resolve: {
    // Vite 8 reads tsconfig.json paths — replaces manual JS/TS aliases.
    tsconfigPaths: true,
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
