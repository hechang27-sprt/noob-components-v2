---
type: package
title: "@noob-naive-ui/registry"
description: The framework-wide, libraryId-keyed override registry shared by every component package — the unified schema for per-library i18n and themeVar override types, the single injection key, and the module-augmentation seam packages use to declare their full locale and theme schemas.
tags: [registry, i18n, theme, override, injection-key]
openwiki:
  roles: [architecture, domain]
  change_kinds: [public-api, lifecycle]
  source_paths: [packages/registry/src/index.ts, packages/registry/src/library-overrides-registry.ts]
  symbols: [LibraryOverridesRegistry, libraryOverridesKey, RegistryI18nOverrides, RegistryThemeOverrides, RegistryI18nLibraryKey, LibraryThemeDescriptor, NaiveUiLocale]
  test_paths: [packages/registry/tests/library-overrides-registry.test.ts]
  invariants: ["keyof LibraryOverridesRegistry is exactly the known libraryIds (no string index signature)", "libraryOverridesKey is the single shared InjectionKey across all packages"]
  validation_commands: ["pnpm --filter @noob-naive-ui/registry test", "pnpm --filter @noob-naive-ui/registry typecheck"]
---

# `@noob-naive-ui/registry`

The registry package (`packages/registry`, workspace name `@noob-naive-ui/registry`)
owns the **framework-wide, libraryId-keyed override registry** that every component
package shares. It unifies the override kinds (i18n messages and themeVars) into one
typed schema and one injection key, so a package declares its **full** locale and
themeVar types exactly once and the per-kind override projections are derived
automatically.

This package was extracted from `@noob-naive-ui/i18n` in the override-registry
refactor: the former i18n-only descriptor/registry
(`libraryI18nOverridesKey`, `LibraryI18nDescriptor`) moved here, generalized to
`{ i18n, theme }` per library. The [i18n package](i18n.md) now consumes these
primitives, and every package that needs overrides depends on this package.

Depends only on `vue` (for the `InjectionKey` type) and `naive-ui` (for the
preseeded locale/theme types). Build: ES library mode with `unplugin-dts`
declarations; externalizes `vue` and `naive-ui`; tests run in the `node`
environment.

## The registry schema (`library-overrides-registry.ts`)

`LibraryOverridesRegistry` maps each known `libraryId` to an entry declaring that
library's **full** locale and themeVar types:

```ts
interface LibraryOverridesRegistry {
  "naive-ui": { locale: NaiveUiLocale; theme: GlobalThemeOverrides };
  "pro-naive-ui": { locale: NaiveUiLocale; theme: GlobalThemeOverrides };
}
```

- The interface deliberately has **no string index signature**: `keyof
  LibraryOverridesRegistry` is exactly the known libraryIds, so every derived
  projection stays per-library typed. Undeclared third-party libraries are still
  admitted at runtime through `LibraryOverridesRegistryValue`'s loose string index.
- `naive-ui` and `pro-naive-ui` are **preseeded** with their override-form types
  (`GlobalThemeOverrides`, and `NaiveUiLocale` — see below), because their override
  shape differs from a component-first schema and the uniform conversion is a
  structural no-op for them.
- A noob package declares its own entry via **module augmentation** — the central
  extension seam:

```ts
declare module "@noob-naive-ui/registry" {
  interface LibraryOverridesRegistry {
    "noob-naive-ui:admin": {
      locale: Record<AdminLocaleName, AdminLocale>;
      theme: AdminThemeComponents;
    };
  }
}
```

Both the [admin package](admin/overview.md) (`"noob-naive-ui:admin"`) and the
[ui package](ui.md) (`"noob-naive-ui:ui"`) use this seam.

## Derived projections

From the one declared schema, the registry derives every override type a host or
consumer needs:

- `DeepPartial<T>` — recursively makes every leaf optional; the base for the i18n
  projection.
- `RegistryI18nOverrides` — per-library locale override trees
  (`Partial<Record<LocaleName, DeepPartial<Locale>>>` for a declared
  `locale: Record<LocaleName, Locale>`).
- `RegistryThemeOverrides` — per-library, per-component partial themeVar override
  trees, converted through `LibraryThemeOverrides<Components>`.
- `LibraryOverridesRegistryValue` — the loose runtime shape
  `{ [libraryId: string]: { i18n?: unknown; theme?: unknown } }` under the
  injection key; entries are re-validated at consumption (boundary casts).

Per-library derivation helpers live in `library-i18n-overrides.ts`:
`RegistryLocaleName<K>` (the library's declared locale-name union),
`RegistryLocale<K>` (the library's component-first full locale schema), and
`RegistryI18nLibraryKey` (libraryIds that declare a usable locale record). The
preseeded `naive-ui`/`pro-naive-ui` entries are **admissible** `RegistryI18nLibraryKey`
values (their `NaiveUiLocale` has real keys) — a documented over-permissiveness:
`createComponentI18n` compiles for them but is semantically meaningless, because
naive-ui texts are consumed by naive-ui's own locale context, not vue-i18n.

## The injection key (`libraryOverridesKey`)

`libraryOverridesKey` is the **single shared `InjectionKey`** under which the whole
registry is provided: `InjectionKey<ComputedRef<LibraryOverridesRegistryValue>>`
(a `Symbol("noob-naive-ui:overrides-registry")`). There is no per-package key.

- Per-package providers (`AdminConfigProvider`, `AdminUiConfigProvider`) read the
  parent value via `inject(libraryOverridesKey, null)` and `provide` their own
  `{ i18n, theme }` slice merged over it — the nearest provider wins for its
  subtree.
- Consumers `inject(libraryOverridesKey, null)` and read `registry?.value?.[libraryId]`
  with optional chaining, so a missing provider degrades to package defaults.

## Theme side (`library-theme-overrides.ts`)

- `LibraryThemeOverrides<Components>` — per-component partial of a component-first
  themeVar schema; `NoobUiThemeOverrides.Card` autocompletes the Card's exact
  `--n-*` var names and rejects unknown keys.
- `LibraryThemeDescriptor<Components>` — a typed theme handle whose runtime value is
  only the stable `libraryId`; the `__theme` brand pins the schema at type level and
  never exists at runtime (the registry test asserts this).

## naive-ui locale preseed (`naive-ui-locale.ts`)

`NaiveUiLocale` is naive-ui's full locale declaration for the registry, composing:

- `locale: NPartialLocale` — the component-chrome pack in `createLocale`'s
  **override form**. Declaring the full `NLocale` instead would NOT be a structural
  no-op: `DeepPartial` would mangle `NLocale`'s function-typed leaves
  (`loadingRequiredMessage`, `total`, …), breaking assignability to
  `createLocale`'s `NPartialLocale` parameter.
- `dateLocale: NDateLocale` — the full date pack (naive-ui ships no partial date
  helper; consumers merge over the base pack themselves).

The admin package consumes this preseed through `AdminProvider.i18nOverrides["naive-ui"]`
and merges it into its derived naive-ui locale ([admin preferences](admin/preferences.md)).

## Tests

`packages/registry/tests/library-overrides-registry.test.ts` (3 `it`):

- exposes exactly one shared injection key (`libraryOverridesKey` is a symbol);
- preseeded `naive-ui` / `pro-naive-ui` entries are admissible
  `RegistryI18nLibraryKey` values with a typed locale override schema;
- a `LibraryThemeDescriptor` carries a stable `libraryId` and no runtime brand
  (`"__theme" in descriptor` is false).

Narrowest validation: `pnpm --filter @noob-naive-ui/registry test`, then
`pnpm --filter @noob-naive-ui/registry typecheck` after type-level changes.

## Change surface for package authors

To give a component package an override surface:

1. Add `@noob-naive-ui/registry` (and `@noob-naive-ui/i18n` for i18n) to the
   package's dependencies.
2. Declare the package's FULL `locale` and `theme` schemas via module augmentation
   of `LibraryOverridesRegistry` (see the admin/ui declarations above) — the schema
   is never declared a second time in a descriptor or override alias.
3. Ship a per-package config provider (modeled on `AdminConfigProvider` /
   `AdminUiConfigProvider`) that merges the package's `{ i18n, theme }` slice into
   the shared registry, or rely on the aggregator (`AdminProvider`) to pass the
   slice through its `i18nOverrides` / theme-preset props.
4. Consumers read overrides via `inject(libraryOverridesKey, null)` with the
   boundary cast at consumption; `createComponentI18n` (from the
   [i18n package](i18n.md)) derives the locale schema from the registry entry.

## Related

- [i18n package](i18n.md) — consumes `libraryOverridesKey` and the derived
  projections in `createComponentI18n`
- [Admin overview](admin/overview.md) — admin declares `"noob-naive-ui:admin"` and
  provides its slice through `AdminConfigProvider`
- [ui package](ui.md) — ui declares `"noob-naive-ui:ui"`, `AdminUiConfigProvider`,
  and `useUiTheme`
- [Admin i18n](admin/i18n.md) — the admin locale override tree is the registry's
  i18n projection
- [Repository Overview](../architecture/overview.md) — workspace dependency
  direction and build pipeline
