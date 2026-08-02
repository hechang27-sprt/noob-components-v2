# Fix locale JSON hot reload

## Goal

While `pnpm --filter demo dev` is running, edits to workspace locale JSON files update source-consumed Vue components without a manual or full-page reload.

## Background

- `apps/demo/vite.config.ts:18` installs `createWorkspaceVueI18nPlugin()`.
- `tooling/vite/vue-i18n.ts:38-43` already owns workspace locale-resource discovery and Vue I18n precompilation.
- `packages/prototype-i18n-verification/src/prototype-card.tsx:50-51` imports and merges its locale JSON during setup.
- Vite sees the JSON edit, but the transformed locale module does not currently produce a usable Vue component HMR boundary.

## Requirements

1. Incorporate locale JSON HMR into `createWorkspaceVueI18nPlugin()` so source-consuming applications receive it with the existing preset.
2. Editing either JSON file under `packages/prototype-i18n-verification/src/locales/PrototypeCard/` must update the corresponding rendered text in an existing demo page session.
3. Prefer invalidating/updating the importing Vue component module so Vue HMR remounts only affected component instances; do not reload the document.
4. Apply only to workspace locale resources already covered by the preset; do not hard-code the prototype package path.
5. Preserve Vue I18n precompilation, component-local Composer behavior, override precedence, and production/built-package behavior.

## Acceptance Criteria

- [ ] Editing `en.json` updates the rendered English default in the existing browser session.
- [ ] Editing `zh-CN.json` updates the rendered Chinese default in the existing browser session.
- [ ] A page-lifetime marker remains unchanged after both edits.
- [ ] Only the importing component HMR boundary is updated; unrelated application state survives.
- [ ] Existing partial overrides still win over updated defaults.
- [ ] Package/demo typechecks and builds pass.
- [ ] No new browser-console warnings or errors occur.

## Out of Scope

- HMR for `apps/demo/src/overrides.ts`.
- Runtime-editable plugin overrides.
- New locales, schema changes, or global message registration.
