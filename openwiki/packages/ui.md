---
type: package
title: "@noob-naive-ui/ui"
description: The small ui package — a Naive UI theme bridge marked obsolete and an empty i18n descriptor surface; mostly a place-holder package today.
tags: [ui, naive-ui, theme, package]
---

# `@noob-naive-ui/ui`

The `ui` package (`packages/ui`) currently ships a minimal surface:

- `src/index.ts` exports the theme bridge (`defineNoobNaiveThemeBridge`,
  `toNoobNaiveThemeOverrides`, `NoobNaiveThemeBridge`) and the ui i18n
  descriptor (`noobUiI18n` + types), and imports `./style.css` for side effects.
- Dependencies: `@noob-naive-ui/i18n`. Peers: `naive-ui`, `vue`, `vue-i18n`
  (`catalog:`).

## Theme bridge (`src/theme/naive.ts`)

`NoobNaiveThemeBridge` is `{ common?: GlobalThemeOverrides["common"], layout?:
{ pageMaxWidth?, contentPadding? } }`. `defineNoobNaiveThemeBridge` normalizes it
and `toNoobNaiveThemeOverrides` maps only the `common` slice into Naive UI
`GlobalThemeOverrides`.

> **Obsolete**: the module carries the comment `// Obsolete ???`. The admin
> package does not use this bridge — it derives all theme configuration itself in
> `runtime/naive-ui-config.ts` (see [Preferences](admin/preferences.md)).
> Treat this file as dead surface pending removal or redesign; do not build new
> consumers on it.

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
