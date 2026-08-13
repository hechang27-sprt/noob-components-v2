import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import { dirname, matchesGlob, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizePath,
  type HmrContext,
  type ModuleNode,
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
 * below an app or package. The predicate mirrors the unplugin `include`
 * globs below without naming any package, so every current and future
 * workspace application and package is covered.
 */
function isWorkspaceLocaleResource(file: string): boolean {
  const normalized = normalizePath(file);
  for (const root of workspaceSourceRoots) {
    const prefix = normalizePath(root);
    if (matchesGlob(normalized, `${prefix}/*/src/locales/**/*.json`)) {
      return true;
    }
  }
  return false;
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
 * The precompiler rewrites each `…/src/locales/*.json` import into a
 * precompiled Intlify virtual module, so at runtime no component imports the
 * raw JSON file — the virtual module is its only graph connection. A raw
 * JSON edit therefore has no importer for Vite's default HMR to propagate
 * from.
 *
 * This companion runs before the precompiler (`enforce: "pre"`) so it can
 * record each real JSON import while the filesystem path is still visible,
 * then {@link handleHotUpdate} redirects a changed resource to the
 * precompiled virtual module its importers depend on. Returning that module
 * makes Vite run its normal propagation from it to the importing component,
 * which self-accepts via plugin-vue/plugin-vue-jsx (`.vue`/`.tsx`/`.jsx`),
 * so the edit re-executes the component and its setup re-applies the fresh
 * resource — no injected `import.meta.hot.accept` boundary and no app-side
 * HMR code. Locale resources must therefore be imported and wired inside a
 * component (e.g. a host `LocaleProvider`), not at app setup in a plain
 * module.
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
     * Records relative JSON imports from untransformed source modules, so
     * {@link handleHotUpdate} can later find the precompiled virtual module each
     * importer depends on.
     *
     * Runs `enforce: "pre"` because the precompiler would otherwise already have
     * virtualized the JSON import into an Intlify virtual module id, hiding the
     * real filesystem path this map is keyed by. It injects no code: HMR is
     * completed by the importer's own self-accept boundary (Vue components via
     * plugin-vue/plugin-vue-jsx), so locale resources are expected to be
     * imported and wired inside a component.
     *
     * @param code - Original source code entering the transform pipeline.
     * @param id - Module ID of the source being transformed.
     * @returns Nothing; this hook leaves source transformation to later plugins.
     */
    transform(code, id) {
      for (const match of code.matchAll(JSON_IMPORT_PATTERN)) {
        const source = match[1];
        if (!source) continue;
        const localeFile = resolve(dirname(id), source);
        if (!isWorkspaceLocaleResource(localeFile)) continue;

        const importers = localeImporters.getOrInsertComputed(
          normalizePath(localeFile),
          () => new Set(),
        );
        importers.add(normalizePath(id));
      }
    },
    /**
     * Returns the Intlify precompiled virtual locale modules reachable from the
     * changed resource's recorded importers, so Vite can propagate the edit.
     *
     * The raw JSON has no importer in the module graph (the precompiler
     * virtualized it), so returning the file itself would leave Vite nothing to
     * propagate from. Instead each importer (recorded in {@link transform}) is
     * resolved in the module graph, and the returned modules are the ones among
     * its importedModules that point at an Intlify virtual locale module — the
     * module components actually depend on. Treating that as the update root,
     * Vite's normal propagation re-imports the importer, whose self-accept
     * boundary re-executes and re-applies the freshly precompiled resource.
     * When none is reachable, return nothing so Vite falls back to default
     * handling rather than forcing a full reload (an empty array would).
     *
     * @param ctx - Vite hot-update context for the changed filesystem resource.
     * @returns The reachable Intlify virtual locale module nodes, or nothing when not applicable.
     */
    handleHotUpdate(ctx: HmrContext) {
      if (!isWorkspaceLocaleResource(ctx.file)) return;

      const importers = localeImporters.get(normalizePath(ctx.file));
      if (!importers) return;

      const virtualModules = new Set<ModuleNode>();
      for (const importerId of importers) {
        const importerModule = ctx.server.moduleGraph.getModuleById(importerId);
        if (!importerModule) continue;
        for (const dependency of importerModule.importedModules) {
          if (dependency.id?.startsWith(INTLIFY_LOCALE_VIRTUAL_PREFIX)) {
            virtualModules.add(dependency);
          }
        }
      }

      // An empty array would force a full reload; fall back to default
      // handling when no virtual dependency is reachable.
      if (virtualModules.size === 0) return;
      return [...virtualModules];
    },
  };
}
