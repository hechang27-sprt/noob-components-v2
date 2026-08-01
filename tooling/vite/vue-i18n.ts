import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Absolute directory of this helper module, derived from its own module URL.
 *
 * Vite bundles `vite.config.ts` and every relative module it imports into a
 * temporary file, rewriting `import.meta.url` per module to that module's
 * real file path; this therefore resolves to `tooling/vite` no matter which
 * application config consumes the helper.
 */
const helperDirectory = dirname(fileURLToPath(import.meta.url));

/**
 * Absolute path of the monorepo root containing the `apps/*` and
 * `packages/*` workspace directories.
 */
const workspaceRoot = resolve(helperDirectory, "../..");

/**
 * Creates a fresh `@intlify/unplugin-vue-i18n` Vite plugin that precompiles
 * workspace locale resources.
 *
 * Input: none. Output: a Vite plugin whose `include` globs cover the
 * conventional workspace locale-resource directories — every `src/locales`
 * tree under `apps/*` and `packages/*` — for every current and future
 * workspace application and package, resolved relative to this helper
 * rather than to any consumer.
 *
 * This is internal monorepo tooling for source-consuming application builds
 * only. Consumers of built package output receive precompiled message ASTs
 * and must not include these globs in their own Vite configuration.
 */
export function createWorkspaceVueI18nPlugin(): ReturnType<
  typeof VueI18nPlugin
> {
  return VueI18nPlugin({
    include: [
      resolve(workspaceRoot, "apps/*/src/locales/**"),
      resolve(workspaceRoot, "packages/*/src/locales/**"),
    ],
  });
}
