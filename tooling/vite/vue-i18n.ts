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

/**
 * Matches top-level Vue I18n composer declarations, optionally exported.
 *
 * Anchored at the start of a line so only module-scope declarations qualify:
 * function-scoped declarations (e.g. inside a component setup) are indented
 * and must keep relying on the component's own self-accepting HMR. The
 * emitted accept callback references the captured identifier at module scope,
 * so matching anything else would be a runtime error on update.
 */
const COMPOSER_DECL_PATTERN =
  /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:createI18n|createComposer)\s*\(/gm;

/** Prefix used by Intlify's generated precompiled locale module IDs. */
const INTLIFY_LOCALE_VIRTUAL_PREFIX = "virtual:intlify-i18n-";

/**
 * Creates a Vite-only HMR companion for workspace locale resources.
 *
 * The companion runs before the precompiler so it can record each real JSON
 * import before that import resolves to an Intlify virtual module. Locale
 * file edits are then redirected to the precompiled virtual module, whose
 * propagation reaches the importing Vue component or accept boundary. For
 * plain-module importers it also injects the accept boundary itself, so
 * workspace locale HMR never needs app-side `import.meta.hot.accept` code.
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
     * Records relative JSON imports from untransformed source modules and
     * injects an HMR accept boundary for plain-module aggregators.
     *
     * Vue component importers (`.vue`/`.tsx`/`.jsx`) self-accept through
     * plugin-vue/plugin-vue-jsx, so locale edits re-execute them directly.
     * Plain modules (e.g. an application `i18n.ts` aggregator) do not, and
     * without an explicit boundary Vite falls back to a full page reload.
     * The precompiler virtualizes each JSON import, but re-applying the
     * fresh resource to the app-owned composer is app code, so the preset
     * emits the boundary for every module that both imports a workspace
     * locale resource and creates a Vue I18n composer at top level. The
     * callback receives the re-imported precompiled virtual module and
     * re-applies the resource to the captured composer (`createI18n`
     * results expose the composer through `.global`; `createComposer`
     * results are composers directly), updating rendered text in place.
     * Production builds strip `import.meta.hot` blocks.
     *
     * @param code - Original source code entering the transform pipeline.
     * @param id - Module ID of the source being transformed.
     * @returns The module with an injected accept block, or nothing when no
     * injection applies (leaving source transformation to later plugins).
     */
    transform(code, id) {
      const jsonSpecifiers = new Set<string>();
      for (const match of code.matchAll(JSON_IMPORT_PATTERN)) {
        const source = match[1];
        if (!source) continue;
        const localeFile = resolve(dirname(id), source);
        if (!isWorkspaceLocaleResource(localeFile)) continue;

        const normalizedLocaleFile = normalizePath(localeFile);
        const importers = localeImporters.getOrInsertComputed(
          normalizedLocaleFile,
          () => new Set(),
        );
        importers.add(normalizePath(id));
        jsonSpecifiers.add(source);
      }

      if (jsonSpecifiers.size === 0) return;

      // A module that already declares its own hot-accept manages its HMR;
      // injecting a second boundary would double-apply the same resource.
      if (code.includes("import.meta.hot.accept")) return;
      const composerNames = [...code.matchAll(COMPOSER_DECL_PATTERN)].map(
        (match) => match[1],
      );
      if (composerNames.length === 0) return;

      const applyPerLocale = composerNames
        .map(
          (name) =>
            `(${name}.global ?? ${name}).setLocaleMessage(locale, messages);`,
        )
        .join("\n        ");
      const acceptBlocks = [...jsonSpecifiers]
        .map(
          (specifier) => `
if (import.meta.hot) {
  import.meta.hot.accept(${JSON.stringify(specifier)}, (next) => {
    const resource = next?.default ?? {};
    for (const [locale, messages] of Object.entries(resource)) {
        ${applyPerLocale}
    }
  });
}`,
        )
        .join("\n");

      return code + acceptBlocks;
    },
    /**
     * Redirects a changed locale resource to its precompiled virtual module.
     *
     * Returning the Intlify virtual module lets Vite's propagation reach both
     * kinds of importer boundary: Vue component importers self-accept, and
     * non-component importers accept the virtual dependency through the
     * boundary injected in `transform`. updateModules invalidates the
     * returned module, so re-imports serve freshly precompiled messages.
     *
     * @param ctx - Vite hot-update context for the changed filesystem resource.
     * @returns Precompiled virtual module nodes for HMR, or nothing when not applicable.
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
          if (!dependency.id?.startsWith(INTLIFY_LOCALE_VIRTUAL_PREFIX))
            continue;
          virtualModules.add(dependency);
        }
      }

      // An empty array would force a full reload; fall back to default
      // handling when no virtual dependency is reachable.
      if (virtualModules.size === 0) return;
      return [...virtualModules];
    },
  };
}
