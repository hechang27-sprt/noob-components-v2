import { resolve } from "node:path";

import vueJsxVapor from "vue-jsx-vapor/vite";
import { defineConfig } from "vitest/config";
import { dtsForBuild, externalFromPackageJson } from "@noob/tooling-vite/vite";

export default defineConfig({
  plugins: [
    vueJsxVapor({ interop: true, macros: true }),
    dtsForBuild({
      tsconfig: "./tsconfig.json",
    }),
  ],
  oxc: {
    exclude: [/\.js$/, /\.d\.[cm]?ts$/],
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      formats: ["es"],
      fileName: (_format: string, name: string) =>
        name.endsWith(".d") ? `${name}.ts` : `${name}.js`,
    },
    rolldownOptions: {
      external: externalFromPackageJson(
        resolve(import.meta.dirname, "package.json"),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      include: ["src/**/*.{ts,tsx,vue}"],
    },
  },
});
