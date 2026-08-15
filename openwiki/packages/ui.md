---
type: package
title: "@noob-naive-ui/ui"
description: The ui package — the per-library config provider, the useUiTheme composable and typed component-first themeVar schema (UiCard), and the i18n key with an empty locale schema; hosts override its slice through the shared registry.
tags: [ui, naive-ui, i18n, theme, package]
openwiki:
  roles: [architecture, domain]
  change_kinds: [public-api, lifecycle]
  source_paths: [packages/ui/src/index.ts, packages/ui/src/i18n/plugin.ts, packages/ui/src/theme/types.ts, packages/ui/src/theme/admin-ui-config-provider.tsx, packages/ui/src/theme/use-ui-theme.ts, packages/ui/src/card/ui-card.tsx]
  symbols: [AdminUiConfigProvider, useUiTheme, noobUiTheme, UiThemeComponents, NoobUiThemeOverrides, UiCard, UiCardThemeVars, noobUiI18n, NoobUiLocaleOverrides]
  test_paths: [packages/ui/tests/use-ui-theme.test.tsx]
  validation_commands: ["pnpm --filter @noob-naive-ui/ui test", "pnpm --filter @noob-naive-ui/ui typecheck"]
---

# `@noob-naive-ui/ui`

The `ui` package (`packages/ui`) ships the **per-library config provider, the
typed themeVar seam, and the first proof component** for the workspace's shared
override registry:

- `AdminUiConfigProvider` (`theme/admin-ui-config-provider.tsx`) — a
  standalone-capable provider that merges the ui package's `{ i18n, theme }`
  slice into the shared registry under `"noob-naive-ui:ui"` (nearest provider
  wins for its subtree).
- `useUiTheme(componentId)` (`theme/use-ui-theme.ts`) — reads one ui component's
  themeVar override slice from the registry; provider-less → `undefined` → the
  component falls back to its own defaults (no throw, unlike naive-ui's
  `useTheme`).
- `UiCard` (`card/ui-card.tsx`) — the proof component: declares its exact
  `--n-*`-style themeVar names, reads its slice via `useUiTheme("Card")`, and
  binds the overrides as inline CSS variables on its root (defaults live in
  `src/style.css` under `.ui-card`).
- The i18n surface is a **key with an empty schema** today: `noobUiI18n =
  "noob-naive-ui:ui"`, `NoobUiComponentId = never`, `NoobUiLocale =
  Record<never, never>`. The seam ships ahead of the first translating component.

Dependencies: `@noob-naive-ui/i18n`, `@noob-naive-ui/registry`, `es-toolkit`
(`merge` in the config provider). Peers: `naive-ui`, `vue`, `vue-i18n`
(`catalog:`). Build: ES library mode with `unplugin-dts` declarations,
`exports["./style.css"]`, `sideEffects: ["**/*.css"]`.

## Public surface (`src/index.ts`)

```ts
export { noobUiI18n } from "./i18n/plugin";
export type {
  NoobUiComponentId, NoobUiI18nSnapshot, NoobUiLocale,
  NoobUiLocaleName, NoobUiLocaleOverrides,
} from "./i18n/plugin";
export { AdminUiConfigProvider, type AdminUiConfigProviderProps } from "./theme/admin-ui-config-provider";
export { useUiTheme } from "./theme/use-ui-theme";
export { noobUiTheme, type NoobUiThemeOverrides, type UiThemeComponents } from "./theme/types";
export { UiCard, type UiCardThemeVars } from "./card/ui-card";
```

## Registry declaration (`theme/types.ts`)

The package declares its FULL locale + themeVar types into the framework-wide
registry via module augmentation — the schema is never declared a second time:

```ts
declare module "@noob-naive-ui/registry" {
  interface LibraryOverridesRegistry {
    "noob-naive-ui:ui": {
      locale: Record<NoobUiLocaleName, NoobUiLocale>;
      theme: UiThemeComponents;
    };
  }
}
```

- `UiThemeComponents` is the component-first themeVar schema; today it has one
  entry, `Card: UiCardThemeVars` (`--ui-card-bg`, `--ui-card-border-color`,
  `--ui-card-padding`). Extend it per component; each entry declares the
  component's exact var names so `NoobUiThemeOverrides.Card` autocompletes them
  and rejects unknown keys at the host boundary.
- `NoobUiThemeOverrides = RegistryThemeOverrides["noob-naive-ui:ui"]` — the
  derived per-component partial override tree.
- `noobUiTheme: LibraryThemeDescriptor<UiThemeComponents>` — a typed theme handle
  whose runtime value is only the stable `libraryId`; the `__theme` brand never
  exists at runtime (see [registry package](registry.md)).

## `AdminUiConfigProvider` and `useUiTheme`

`AdminUiConfigProvider` mirrors the admin package's `AdminConfigProvider`
([Admin overview](admin/overview.md)): `inject(libraryOverridesKey, null)`,
`merge` the ui slice `{ i18n, theme }` over the parent value into a `computed`,
and `provide` it back under the same key. Standalone-capable: outside any
aggregator it supplies only its own slice.

`useUiTheme(componentId)` injects the registry and returns
`computed<Partial<UiThemeComponents[K]> | undefined>` for the requested component.
The `as … | undefined` cast is the registry read boundary: `.theme` is `unknown`
in the loose runtime value, and the cast does NOT weaken exact-`--n-*` typing —
unknown var names were already rejected at the host `NoobUiThemeOverrides` prop
boundary.

## i18n key (`src/i18n/plugin.ts`)

`noobUiI18n = "noob-naive-ui:ui"` is the stable library key under which hosts
provide ui overrides in the shared registry. The derived
`NoobUiI18nSnapshot`/`NoobUiLocaleOverrides` types come from the registry's i18n
projection of the ui augmentation. With no components registered yet, hosts can
only supply empty per-locale slices. The convention for extending it: grow the
`NoobUiComponentId` union, then locale-first resources live under
`src/locales/<ComponentName>.json` and are precompiled by the shared workspace
preset ([tooling](../tooling/vite-plugins.md)). Hosts supply ui overrides through
`AdminProvider`'s `i18nOverrides` prop under the `noob-naive-ui:ui` key
([Admin root provider](admin/provider.md)), or by mounting `AdminUiConfigProvider`
directly.

## Stylesheet (`src/style.css`)

Tailwind v4 CSS: `@layer theme, base, components, utilities;`, imports
`tailwindcss/theme.css` and `tailwindcss/utilities.css` with `source(none)`,
**preflight disabled**, and `@source "."`. Exported as `./style.css` subpath with
`sideEffects: ["**/*.css"]`; the admin stylesheet re-imports it
(`@import "@noob-naive-ui/ui/style.css"`). The `.ui-card` defaults
(`--ui-card-bg`, `--ui-card-border-color`, `--ui-card-padding`) live here. See the
build pipeline section in [Repository Overview](../architecture/overview.md).

## Tests

`packages/ui/tests/use-ui-theme.test.tsx` (happy-dom, 3 `it`):

- binds the `themeOverride` Card slice as inline CSS vars through
  `AdminUiConfigProvider`;
- renders no inline style vars without a provider (defaults fall through);
- keeps exact var names in the typed override surface (compile-time check).

Narrowest validation: `pnpm --filter @noob-naive-ui/ui test` (component behavior)
or `pnpm --filter @noob-naive-ui/ui typecheck` (type-surface changes).

## Related

- [registry package](registry.md) — the schema this package augments and the
  `libraryOverridesKey` it provides
- [i18n package](i18n.md) — the shared i18n primitives (empty ui schema today)
- [Admin overview](admin/overview.md) — the sibling admin package's config provider
  and aggregator
- [Admin preferences](admin/preferences.md) — how preset theme overrides reach the
  ui slice through `AdminProvider`
- [Repository Overview](../architecture/overview.md) — build pipeline and
  `./style.css` subpath contract
