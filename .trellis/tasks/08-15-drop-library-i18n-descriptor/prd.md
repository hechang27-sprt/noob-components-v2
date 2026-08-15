# Drop `library-i18n-descriptor.ts`; hook `createComponentI18n` into `LibraryOverridesRegistry`

**Date**: 2026-08-15
**Package**: i18n, registry, admin, ui
**Status**: Planning

## Problem

`@noob-naive-ui/registry` already declares each component package's **FULL** locale
and themeVar types via module augmentation into `LibraryOverridesRegistry` and
derives the override projections (`RegistryI18nOverrides` / `RegistryThemeOverrides`)
from them. The i18n package still carries a parallel typed-handle machinery in
`packages/i18n/src/library-i18n-descriptor.ts` — `LibraryI18nDescriptor` (+ the
`__i18n` brand), `LibraryI18nOverrides`, `LibraryI18nSnapshot`,
`LibraryI18nComponentSelector` — whose schema pinning duplicates what the registry
augmentation already pins per `libraryId`. `createComponentI18n` consumes the
descriptor (`{ messages, descriptor, componentId }`), so every package declares
its locale schema twice: once in the registry augmentation, once in its
descriptor + override aliases.

## Goal

Delete `packages/i18n/src/library-i18n-descriptor.ts`. `createComponentI18n`
reads its locale schema directly from `LibraryOverridesRegistry` via the
`libraryId` argument (the registry entry becomes the type brand), so packages
declare their locale schema in exactly one place.

## Requirements

- `createComponentI18n` takes `{ messages, libraryId, componentId }`; `libraryId`
  is constrained to registry keys that declare a usable locale schema (preseeded
  `naive-ui`/`pro-naive-ui` with `locale: unknown` stay inadmissible).
- The locale schema (`LocaleName`, `Locale`) is derived from
  `LibraryOverridesRegistry[libraryId]["locale"]`; component ids are typed as
  `keyof Locale & string`; `messages` stays `Readonly<Record<LocaleName, unknown>>`
  with the all-locales-required check preserved.
- **All registry-derived i18n typing lives in the registry package**, in a new
  `packages/registry/src/library-i18n-overrides.ts` (mirroring
  `library-theme-overrides.ts`): `RegistryLocaleName<K>`, `RegistryLocale<K>`,
  `RegistryI18nLibraryKey`; exported from the registry barrel; the i18n package
  imports them (no local copies). Public override aliases inline
  `NonNullable<RegistryI18nOverrides["<libraryId>"]>` — no extra helper type.
- The descriptor-file runtime/type exports are disposed of:
  - `LibraryI18nDescriptor`, `LibraryI18nOverrides`, `LibraryI18nSnapshot`,
    `LibraryI18nComponentSelector` — removed from the i18n public barrel.
  - `emptySnapshot` and `selectComponentOverrides` — relocated (new home in
    `use-component-i18n.ts`), still exported from the i18n barrel; behavior unchanged.
- Package public aliases keep their names and shapes but derive from the
  registry: `AdminLocaleOverrides`, `NoobUiLocaleOverrides`,
  `AdminI18nSnapshot`, `NoobUiI18nSnapshot` =
  `NonNullable<RegistryI18nOverrides["<libraryId>"]>` (structurally identical to
  today — verified; the strip is inlined at each alias). `adminI18n` / `noobUiI18n`
  become libraryId literal consts.
- `AdminProvider`'s render drops its four boundary casts (`as keyof
  RegistryI18nOverrides` / `as keyof AdminPresetThemeOverrides` /
  `as …LocaleOverrides | undefined`) — direct registry-key indexing is typed.
- No behavior change at runtime: override resolution, empty-snapshot fallback,
  component slice selection, Composer construction, and the `libraryOverridesKey`
  registry all stay as they are today.
- `tsafe` becomes unused in `packages/i18n` and is removed from its dependencies.
- **naive-ui locale override hooked into the registry** (architect-directed):
  the naive-ui / pro-naive-ui preseed declares `NaiveUiLocale =
  { locale: NPartialLocale; dateLocale: NDateLocale }` (pack in `createLocale`'s
  override form — full `NLocale` is empirically rejected by `DeepPartial`'s
  function-leaf mangling; date full, merged by hand); hosts supply
  `i18nOverrides["naive-ui"]` and `naiveUiConfig` merges it over the
  preference-resolved base packs (`createLocale` for the pack, `merge` for the
  date pack). naive-ui / pro-naive-ui become admissible
  `RegistryI18nLibraryKey` members (accepted over-permissiveness).

## Non-goals

- Theme side (`LibraryThemeDescriptor`, `noobUiTheme`, `useUiTheme`) — same
  folding is possible and is noted in the design as a follow-up, but is out of
  scope here.
- `packages/prototype-i18n-verification` — self-contained harness with its own
  selector/plugin; unaffected (non-goal since the 08-13 registry task).
- Any runtime behavior change, registry-value shape change, or new provider.

## Acceptance Criteria

- [ ] `packages/i18n/src/library-i18n-descriptor.ts` deleted; i18n barrel no longer
      exports `LibraryI18nDescriptor` / `LibraryI18nOverrides` /
      `LibraryI18nSnapshot` / `LibraryI18nComponentSelector`.
- [ ] `createComponentI18n` accepts `{ messages, libraryId, componentId }` with
      `libraryId: K` constrained to registry keys with a declared locale schema;
      `componentId` rejects unknown component ids at compile time; partial
      `messages` (missing a locale) still errors; preseeded `naive-ui` /
      `pro-naive-ui` are rejected as libraryIds.
- [ ] `emptySnapshot` + `selectComponentOverrides` still exported from
      `@noob-naive-ui/i18n`, same runtime behavior (frozen empty fallback,
      per-component slice selection skipping absent locales).
- [ ] `packages/registry/src/library-i18n-overrides.ts` exists (mirror of
      `library-theme-overrides.ts`) and the registry barrel exports
      `RegistryLocaleName`, `RegistryLocale`, `RegistryI18nLibraryKey`; the i18n
      package imports them, defining none locally. No `RegistryI18nOverridesFor`
      helper exists.
- [ ] `AdminLocaleOverrides`, `NoobUiLocaleOverrides`, `AdminI18nSnapshot`,
      `NoobUiI18nSnapshot` derive from
      `NonNullable<RegistryI18nOverrides["<libraryId>"]>` and keep their current
      shapes (mutual assignability with the old `LibraryI18nOverrides<…>` aliases).
- [ ] `adminI18n` / `noobUiI18n` are libraryId literal consts; every
      `…I18n.libraryId` reference and every `AdminProvider` render cast is gone.
- [ ] i18n tests declare their own registry augmentation for the harness
      library; `library-i18n-descriptor.test.ts` rewritten (descriptor-shape
      assertions obsolete) or folded.
- [ ] `tsafe` removed from `packages/i18n/package.json` and the lockfile;
      no remaining `tsafe` imports in `packages/i18n/src`.
- [ ] Gates green: `pnpm --filter @noob-naive-ui/registry typecheck && test`,
      `pnpm --filter @noob-naive-ui/i18n typecheck && test && build`,
      `pnpm --filter @noob-naive-ui/ui typecheck && test && build`,
      `pnpm --filter @noob-naive-ui/admin typecheck && test`, demo typecheck,
      workspace `tsc -b --noEmit`, oxlint, format:check.
- [ ] `.trellis/spec/ui/frontend/library-i18n-contract.md` §2/§3 updated to the
      descriptor-less contract; the `LibraryI18nOverrides` doc comment in
      `packages/registry/src/library-overrides-registry.ts` updated.
- [ ] `packages/registry/src/naive-ui-locale.ts` exists with `NaiveUiLocale`
      (locale = `NPartialLocale`, dateLocale = `NDateLocale`); naive-ui /
      pro-naive-ui preseed `locale: NaiveUiLocale`; `RegistryI18nOverrides["naive-ui"]`
      is the typed host override tree; `mergeAdminNaiveUiLocaleOverrides` +
      `useAdminProvider({ naiveUiLocaleOverrides })` + `AdminProvider`
      pass-through implemented; naive-ui locale merge covered by admin tests.

## Notes

- **Breaking** — intentional, same as the two prior registry tasks (clean
  cutover, no aliases): the i18n public API loses four types and
  `createComponentI18n`'s option shape changes (`descriptor` → `libraryId`).
  All consumers are in-repo (admin/ui/demo/tests) and migrate in this task.
- Key TS constraint verified in research: generic-over-`K` projections collapse
  inside function bodies; the working signature uses secondary
  `LocaleName`/`Locale` params defaulted from `K` plus `NoInfer` — see
  `research/type-proof.md`.
