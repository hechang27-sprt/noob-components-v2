---
type: package
title: "@noob-naive-ui/ui"
description: The minimal ui package — an empty i18n descriptor surface (`NoobUiComponentId = never`) and the shared Tailwind v4 stylesheet that the admin package re-imports; mostly a place-holder package today.
tags: [ui, naive-ui, i18n, package]
---

# `@noob-naive-ui/ui`

The `ui` package (`packages/ui`) currently ships a minimal surface:

- `src/index.ts` exports the ui i18n descriptor (`noobUiI18n` + types) and
  imports `./style.css` for side effects. The former theme bridge
  (`src/theme/naive.ts`, `defineNoobNaiveThemeBridge`,
  `toNoobNaiveThemeOverrides`, `NoobNaiveThemeBridge`) **has been removed** —
  the admin package derives all theme configuration itself in
  `runtime/naive-ui-config.ts` (see [Preferences](admin/preferences.md)).
- Dependencies: `@noob-naive-ui/i18n`. Peers: `naive-ui`, `vue`, `vue-i18n`
  (`catalog:`).

## Public surface (`src/index.ts`)

```ts
export { noobUiI18n } from "./i18n/plugin";
export type {
  NoobUiComponentId,
  NoobUiI18nSnapshot,
  NoobUiLocaleName,
  NoobUiLocaleOverrides,
} from "./i18n/plugin";
```

The barrel exports only the i18n descriptor and its types. There is no theme
surface, no component, and no runtime logic today.

## i18n descriptor (`src/i18n/plugin.ts`)

`noobUiI18n` is a `LibraryI18nDescriptor<NoobUiLocaleName, Record<never, never>>`
with `libraryId: "noob-naive-ui:ui"` — the same descriptor shape the admin
package uses (see [i18n package](i18n.md) and
[Admin i18n](admin/i18n.md)). The component id union `NoobUiComponentId` is
`never` today — the package ships no translatable text. The descriptor ships
ahead of the first translating component; the comment states the convention for
extending it: the union grows, and locale-first resources then live under
`src/locales/<ComponentName>.json` and are precompiled by the shared workspace
preset ([tooling](../tooling/vite-plugins.md)). Hosts would supply ui overrides
through the same shared `libraryI18nOverridesKey` registry (via the admin
`AdminProvider` `overrides` prop) under the `noob-naive-ui:ui` key.

## Stylesheet (`src/style.css`)

Tailwind v4 CSS: `@layer theme, base, components, utilities;`, imports
`tailwindcss/theme.css` and `tailwindcss/utilities.css` with `source(none)`,
**preflight disabled**, and `@source "."`. Exported as `./style.css` subpath with
`sideEffects: ["**/*.css"]`; the admin stylesheet re-imports it
(`@import "@noob-naive-ui/ui/style.css"`). See the build pipeline section in
[Repository Overview](../architecture/overview.md).

## Tests

No test suite exists for the ui package (`tests/` directory absent); its
behavior is exercised indirectly through the admin package and demo.

## Related

- [i18n package](i18n.md) — the shared descriptor/registry primitives
- [Admin i18n](admin/i18n.md) — the same descriptor pattern with real components
- [Admin preferences](admin/preferences.md) — the admin package derives its own
  theme configuration (the removed bridge is not needed)
- [Repository Overview](../architecture/overview.md) — build pipeline and
  `./style.css` subpath contract
