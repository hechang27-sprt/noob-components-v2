import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizePath,
  type HmrContext,
  type Plugin,
  type PluginOption,
} from "vite";

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
 * Workspace directories whose `src/locales` trees the preset precompiles.
 * Kept in sync with the unplugin `include` globs so the HMR companion
 * recognizes exactly the resources the preset already owns.
 */
const workspaceSourceRoots = [
  resolve(workspaceRoot, "apps"),
  resolve(workspaceRoot, "packages"),
];

/**
 * True when `file` is JSON in a conventional workspace `src/locales` tree
 * below an app or package. The predicate
 * mirrors the unplugin `include` globs below without naming any package, so
 * every current and future workspace application and package is covered.
 */
function isWorkspaceLocaleResource(file: string): boolean {
  const normalized = normalizePath(file);
  if (!normalized.endsWith(".json")) return false;
  for (const root of workspaceSourceRoots) {
    const prefix = `${normalizePath(root)}/`;
    if (!normalized.startsWith(prefix)) continue;
    const remainder = normalized.slice(prefix.length);
    const packageBoundary = remainder.indexOf("/");
    if (packageBoundary <= 0) continue;
    return remainder.startsWith("src/locales/", packageBoundary + 1);
  }
  return false;
}

/** True when `id` names a Vue SFC or Vue JSX/TSX component module. */
function isVueComponentModule(id: string): boolean {
  return /\.(?:vue|tsx|jsx)$/.test(id);
}

/**
 * Creates the workspace locale Vite plugin preset: the existing
 * `@intlify/unplugin-vue-i18n` precompiler plus a Vite-only HMR companion.
 * Vite flattens nested plugin presets, so consumers keep installing the
 * preset exactly as before.
 *
 * Input: none. Output: a Vite plugin preset whose `include` globs cover the
 * conventional workspace locale-resource directories — every `src/locales`
 * tree under `apps/*` and `packages/*` — for every current and future
 * workspace application and package, resolved relative to this helper
 * rather than to any consumer.
 *
 * This is internal monorepo tooling for source-consuming application builds
 * only. Consumers of built package output receive precompiled message ASTs
 * and must not include these globs in their own Vite configuration.
 */
export function createWorkspaceVueI18nPlugin(): PluginOption {
  return [
    createWorkspaceLocaleHmrPlugin(),
    VueI18nPlugin({
      include: [
        resolve(workspaceRoot, "apps/*/src/locales/**"),
        resolve(workspaceRoot, "packages/*/src/locales/**"),
      ],
    }),
  ];
}

/** Finds static JSON import specifiers in source modules before transformation. */
const JSON_IMPORT_PATTERN = /(?:from\s*|import\s*)["']([^"']+\.json)["']/g;

/** Prefix used by Intlify's generated precompiled locale module IDs. */
const INTLIFY_LOCALE_VIRTUAL_PREFIX = "virtual:intlify-i18n-";

/**
 * Creates a Vite-only HMR companion for workspace locale resources.
 *
 * The companion runs before the precompiler so it can record each real JSON
 * import before that import resolves to an Intlify virtual module. Locale file
 * edits are then redirected to the recorded Vue component boundaries.
 *
 * @returns A serve-only Vite plugin that bridges locale edits to importers.
 */
function createWorkspaceLocaleHmrPlugin(): Plugin {
  /** Maps normalized locale resource paths to normalized importer module IDs. */
  const localeImporters = new Map<string, Set<string>>();

  return {
    name: "noob:workspace-locale-hmr",
    apply: "serve",
    enforce: "pre",
    /**
     * Records relative JSON imports from untransformed Vue component source.
     *
     * @param code - Original source code entering the transform pipeline.
     * @param id - Module ID of the source being transformed.
     * @returns Nothing, leaving source transformation to subsequent plugins.
     */
    transform(code, id) {
      if (!isVueComponentModule(id)) return;

      for (const match of code.matchAll(JSON_IMPORT_PATTERN)) {
        const source = match[1];
        if (!source) continue;
        const localeFile = resolve(dirname(id), source);
        if (!isWorkspaceLocaleResource(localeFile)) continue;

        const normalizedLocaleFile = normalizePath(localeFile);
        const importers =
          localeImporters.get(normalizedLocaleFile) ?? new Set();
        importers.add(normalizePath(id));
        localeImporters.set(normalizedLocaleFile, importers);
      }
      return;
    },
    /**
     * Redirects a changed locale resource to its recorded Vue component importers.
     *
     * @param ctx - Vite hot-update context for the changed filesystem resource.
     * @returns Component module nodes for Vue HMR, or nothing when not applicable.
     */
    handleHotUpdate(ctx: HmrContext) {
      if (!isWorkspaceLocaleResource(ctx.file)) return;

      const importers = localeImporters.get(normalizePath(ctx.file));
      if (!importers) return;

      const componentModules = [...importers]
        .filter(isVueComponentModule)
        .map((id) => ctx.server.moduleGraph.getModuleById(id))
        .filter((module) => module !== undefined);

      // Component refresh alone would reuse the stale precompiled virtual
      // dependency. Invalidate those dependencies before Vue reloads setup.
      const invalidatedModules = new Set();
      for (const componentModule of componentModules) {
        for (const dependency of componentModule.importedModules) {
          if (!dependency.id?.startsWith(INTLIFY_LOCALE_VIRTUAL_PREFIX))
            continue;
          ctx.server.moduleGraph.invalidateModule(
            dependency,
            invalidatedModules,
            ctx.timestamp,
            true,
          );
        }
      }
      return componentModules;
    },
  };
}
