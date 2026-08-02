# Design: workspace locale HMR preset

## Approach

Change `createWorkspaceVueI18nPlugin()` from a single-plugin factory into a Vite plugin preset. Vite explicitly supports nested plugin presets and flattens their arrays.

The preset contains:

1. the existing `@intlify/unplugin-vue-i18n` plugin with unchanged workspace locale includes;
2. a small Vite-only HMR companion plugin.

During development, the companion plugin's `handleHotUpdate` hook filters changed files to JSON resources under the same conventional `apps/*/src/locales/**` and `packages/*/src/locales/**` roots. It returns the changed locale module's direct Vue/TSX importer modules as the HMR update targets. Vue's plugin-generated component HMR boundary then refreshes only affected component instances, causing setup to run again and merge the latest precompiled JSON into a fresh local Composer.

No client controller, reactive translation registry, public runtime API, or component-specific `import.meta.hot` code is added.

## Why This Boundary

`createWorkspaceVueI18nPlugin()` already owns source-consumed workspace locale discovery. Adding the HMR behavior there keeps applications on one convention and prevents every localized component from implementing the same dependency acceptance logic.

Vite documents that plugin factories may return plugin presets (nested arrays are flattened) and that `handleHotUpdate` may return a filtered module list to make HMR more precise:

- https://vite.dev/guide/api-plugin#plugins-config
- https://vite.dev/guide/api-plugin#handlehotupdate
- https://vite.dev/changes/hotupdate-hook

Although Vite 8 includes the newer environment-aware `hotUpdate` hook, Vite's current migration note says moving away from `handleHotUpdate` is not yet recommended. The implementation will therefore use `handleHotUpdate` unless the installed Vite types/runtime prove otherwise.

## Invariants

- Production builds retain the existing precompilation behavior; HMR hooks only execute in the dev server.
- The helper matches workspace locale conventions, not a package name.
- Vue I18n global/local ownership is unchanged.
- If a locale module has multiple component importers, all direct component importers update.
- No full-reload websocket event is sent.

## Risk

Returning an importer is sufficient only if the Vue JSX plugin marks that importer as an accepted component boundary. The browser reproduction will verify this. If it does not, the implementation will use the same companion plugin to emit a narrowly scoped custom update rather than falling back to document reload.
