import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vite";

/**
 * Selects demo-specific Vite resolution for the invoked command.
 *
 * @param command The Vite command being executed.
 * @returns Source aliases and workspace filesystem access only for development.
 */
export default defineConfig(({ command }) => {
  const isDevelopmentServer = command === "serve";

  return {
    plugins: [tailwindcss(), vueJsx()],
    resolve: isDevelopmentServer
      ? {
          alias: [
            {
              find: "@noob-naive-ui/admin/style.css",
              replacement: resolve(
                __dirname,
                "../../packages/admin/src/style.css",
              ),
            },
            {
              find: "@noob-naive-ui/admin",
              replacement: resolve(
                __dirname,
                "../../packages/admin/src/index.ts",
              ),
            },
            {
              find: "@noob-naive-ui/ui/style.css",
              replacement: resolve(__dirname, "../../packages/ui/src/style.css"),
            },
            {
              find: "@noob-naive-ui/ui",
              replacement: resolve(__dirname, "../../packages/ui/src/index.ts"),
            },
          ],
        }
      : undefined,
    server: isDevelopmentServer
      ? {
          fs: {
            allow: [resolve(__dirname, "../..")],
          },
        }
      : undefined,
  };
});
