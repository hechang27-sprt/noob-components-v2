# Implement: Remove AdminProvider-era vestiges

## Ordered steps

1. `git`-safety: current state is on the `08-12-remove-adminprovider-vestiges` branch off the last archive commit; confirm clean working copy.
2. **ui theme**: delete `packages/ui/src/theme/naive.ts` (+ dir); drop the theme-bridge re-export block from `packages/ui/src/index.ts`.
3. **admin plugin**: in `packages/admin/src/i18n/plugin.ts` remove `adminI18nPlugin` (value + doc); remove its re-export from `packages/admin/src/index.ts`. Verify `AdminI18nPluginOptions` still needed by `AdminProviderProps.overrides` — keep if so.
4. **test rewrite**: `packages/admin/tests/i18n-contract.test.tsx` — AdminProvider overrides-prop path for `mountLoginPage` + `capturePluginSnapshot`→`captureProviderSnapshot`; keep `selectComponentOverrides` assertions.
5. **spec**: `library-i18n-contract.md` alias list + host-install note.
6. **verify**: admin+ui typecheck/tests/build; oxlint+oxfmt on touched files; grep for lingering refs (excluding `dist/`, `openwiki/`).
7. **commit** (`feat(admin,ui): remove AdminProvider-era vestiges`-style), record journal, update index.

## Files touched

- `packages/ui/src/theme/naive.ts` (delete), `packages/ui/src/index.ts` (edit)
- `packages/admin/src/i18n/plugin.ts` (edit), `packages/admin/src/index.ts` (edit)
- `packages/admin/tests/i18n-contract.test.tsx` (rewrite portions)
- `.trellis/spec/ui/frontend/library-i18n-contract.md` (edit)

## Notes / gotchas

- `adminI18n` descriptor and `adminI18nOverridesKey`/`DEFAULT_SNAPSHOT`/`selectComponentOverrides` must remain exported (login/shell/provider + tests use them).
- `AdminI18nPluginOptions` is referenced by `AdminProviderProps.overrides` — only drop the `adminI18nPlugin` **value**, not the type.
- OpenWiki `openwiki/packages/ui.md` regenerates on the scheduled workflow; do not hand-edit.

## Extension (same task): shrink + rename createLibraryI18nPlugin

Mid-task the user asked to shrink the factory's API now that its main transport
use was removed. Included in the same commit:

- Renamed `createLibraryI18nPlugin` -> `createLibraryI18nDescriptor`; interface
  `LibraryI18nPlugin` -> `LibraryI18nDescriptor`; file renamed to
  `library-i18n-descriptor.ts`.
- Dropped the Vue plugin transport (`.plugin`) and `LibraryI18nPluginOptions`.
  The descriptor now carries only `overridesKey` + `emptySnapshot` +
  `selectComponentOverrides`. Hosts provide the snapshot via the key
  (AdminProvider `overrides` prop does `structuredClone`).
- `createComponentI18n` option `plugin` -> `descriptor`.
- Admin: `AdminProviderProps.overrides` now `AdminLocaleOverrides`; dropped
  `AdminI18nPluginOptions` type; `adminI18n` uses the new factory.
- ui: removed `noobUiI18nPlugin` (last `.plugin` consumer) + `NoobUiI18nPluginOptions`;
  exported the `noobUiI18n` descriptor seam.
- Tests: `library-i18n-descriptor.test.ts` (dropped plugin-install test);
  `use-component-i18n.test.tsx` provides the snapshot via the key; `plugin:` ->
  `descriptor:` in admin components.
- Spec `library-i18n-contract.md` updated throughout (descriptor, provide path).

Verification: i18n 22/22, admin 82 pass / 2 pre-existing theme failures,
admin+ui+i18n+demo+prototype typecheck clean, builds clean, oxlint+oxfmt clean.
