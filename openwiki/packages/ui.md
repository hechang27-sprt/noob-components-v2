---
type: package
title: "@noob-naive-ui/ui"
description: The ui package — the per-library config provider, the registry-backed useUiTheme/useUiCssVarsFor theme seam, the Example verification component, the CardTabs connected segmented tab bar, and the locale/theme augmentations hosts override through the shared registry.
tags: [ui, naive-ui, i18n, theme, tailwind]
openwiki:
  roles: [architecture, domain]
  change_kinds: [public-api, lifecycle]
  source_paths: [packages/ui/src/index.ts, packages/ui/src/theme.ts, packages/ui/src/i18n.ts, packages/ui/src/config-provider.tsx, packages/ui/src/components/example/root.tsx, packages/ui/src/components/card-tabs/root.tsx, packages/ui/src/components/card-tabs/runtime.ts]
  symbols: [AdminUiConfigProvider, useUiTheme, useUiCssVarsFor, noobUiTheme, CSS_PREFIX, NoobUiThemeComponents, NoobUiThemeOverrides, NoobUiLocale, NoobUiLocaleName, NoobUiLocaleOverrides, Example, CardTabs]
  test_paths: [packages/ui/tests/use-ui-theme.test.tsx]
  validation_commands: ["pnpm --filter @noob-naive-ui/ui test", "pnpm --filter @noob-naive-ui/ui typecheck"]
---

# `@noob-naive-ui/ui`

The `ui` package (`packages/ui`) ships the **per-library config provider, the
registry-backed themeVar seam, and the first component libraries** for the
workspace's shared override registry:

- `AdminUiConfigProvider` (`config-provider.tsx`) — a standalone-capable
  provider that merges the ui package's `{ i18n, theme }` slice into the shared
  registry under `"noob-naive-ui:ui"` (nearest provider wins for its subtree).
- `useUiTheme(componentId, defaults?)` (`theme.ts`) — reads one ui component's
  themeVar override slice from the registry, resolves the component's default
  values (a getter runs inside the computed), merges the override slice on top,
  and emits the exact `--noob-ui-<component>-<kebab-case>` CSS var record.
  Provider-less / undefined-slice → the component's own defaults (no throw).
- `useUiCssVarsFor(componentId)` — typed `$css` / `$var` / `$tw` helpers bound
  to the ui CSS prefix (`noob-ui`), used inside ui component render functions.
- `Example` (`components/example/`) — the proof component: declares its themeVar
  schema (`ExampleThemeVars: background, borderColor, padding: ThemeVarValue`) and
  its locale schema (`NoobUiExampleLocale` from `locales/Example.json`), reads
  both through `useUiTheme` / `createComponentI18n`, and renders the
  `--noob-ui-example-…` CSS vars inline with packaged defaults. Used by the demo
  `InternationalizationDemoPage` to prove the registry contract.
- `CardTabs` (`components/card-tabs/`) — a connected, segmented tab bar (the
  "fillet" cut-out look) consumed by `AdminShellTabbar`. `CardTabs.Root` owns the
  CSS-grid layout, scroll container, and bar-level keyboard navigation;
  `CardTabs.Tab` registers with the shared controller on mount and renders a
  `grid-cols-subgrid` scope positioned by runtime CSS vars.

Dependencies: `@noob-naive-ui/i18n`, `@noob-naive-ui/registry`, `es-toolkit`
(`merge` in the config provider), `tailwind-variants`. Peers: `naive-ui`, `vue`,
`vue-i18n` (`catalog:`). Build: ES library mode with `unplugin-dts`
declarations, `exports["./style.css"]`, `sideEffects: ["**/*.css"]`, and the
`vue-jsx-vapor` plugin (`interop`, `macros`) for the components.

## Public surface (`src/index.ts`)

```ts
export type { NoobUiLocale, NoobUiLocaleName, NoobUiLocaleOverrides } from "./i18n";
export { AdminUiConfigProvider, type AdminUiConfigProviderProps } from "./config-provider";
export { useUiTheme } from "./theme";
export { CSS_PREFIX, noobUiTheme, type NoobUiThemeOverrides, type NoobUiThemeComponents } from "./theme";
export * from "./registry";
export * from "./components/example";
export * from "./components/card-tabs";
```

`noobUiTheme` (`theme.ts`) is the ui library's typed `LibraryThemeDescriptor`
handled by the registry; its runtime value is only the stable `libraryId`
(`"noob-naive-ui:ui"`), the `__theme` brand pins the schema at type level and
never exists at runtime.

## Registry declaration (`registry.ts`)

The package declares its FULL locale + themeVar types into the framework-wide
registry via module augmentation — the schema is never declared a second time:

```ts
declare module "@noob-naive-ui/registry" {
  interface LibraryOverridesRegistry {
    [LIB_ID]: {
      locale: Record<NoobUiLocaleName, NoobUiLocale>;
      theme: NoobUiThemeComponents;
    };
  }
}
```

- `NoobUiThemeComponents` (`theme.ts`) is the component-first themeVar schema
  hook — an **empty mergeable interface**. Each component augments it via module
  augmentation targeting `@noob-naive-ui/ui` (e.g. `ExampleThemeVars` from
  `components/example/theme.ts`, `CardTabsThemeVars` from
  `components/card-tabs/theme.ts`). Each entry declares the component's exact
  camelCase var names so `NoobUiThemeOverrides.Example` autocompletes them and
  rejects unknown keys (including raw `--noob-ui-…` names) at the host boundary.
- `NoobUiThemeOverrides = RegistryThemeOverrides[typeof LIB_ID]` — the derived
  per-component partial override tree.
- `NoobUiLocale` (`i18n.ts`) is the locale augmentation hook: an empty interface
  extended per component by `components/example/i18n.ts`
  (`NoobUiExampleLocale = LocaleFileMap["Example"]["en"]`). `NoobUiLocaleName =
  "en" | "zh-CN"`; `NoobUiLocaleOverrides = RegistryI18nOverrides[typeof LIB_ID]`.

## `useUiTheme` and `useUiCssVarsFor` (`theme.ts`)

`useUiTheme` is a thin wrapper over the registry's `useTheme`
<!-- openwiki: broken internal link [../registry.md] file "../registry.md" does not exist. Fix the href or restore the target, then delete this comment. -->
([registry package](../registry.md)):

```ts
export function useUiTheme<const K extends keyof NoobUiThemeComponents>(
  componentId: K,
  defaults?: Partial<NoobUiThemeComponents[K]> | (() => Partial<NoobUiThemeComponents[K]>),
) {
  return useTheme({ libraryId: LIB_ID, cssPrefix: CSS_PREFIX, componentId, defaults });
}
```

- The `defaults` getter runs inside the computed so reactive sources (e.g.
  naive-ui `useThemeVars()` in `CardTabs`) trigger re-evaluation.
- With `defaults` provided, the output is never `undefined` (type-level);
  without defaults, an empty resolution yields `undefined`.
- Size-keyed `ThemeVarValue` leaves (e.g. `padding: { small, medium, large }`)
  resolve against the active font-size tier injected under `themeFontSizeKey`
  (`AdminProvider` provides it; absent a provider, `"medium"` is the default).
- `useUiCssVarsFor` returns the typed `$css`/`$var`/`$tw` helpers from the
  registry's `useCssVarsFor` bound to `CSS_PREFIX = "noob-ui"`.

## `Example` (`components/example/`)

The i18n + theme proof component:

- `root.tsx` — `useUiTheme("Example", { background: "#ffffff",
  borderColor: "#d0d5dd", padding: { small: "0.75rem", medium: "1rem",
  large: "1.25rem" } })` plus `createComponentI18n({ messages: exampleMessages,
  libraryId: "noob-naive-ui:ui", componentId: "Example" })`; renders
  `style={overrides.value}` on `.example` so the root always carries the
  `--noob-ui-example-…` variables (defaults merged under any provider override).
  No stylesheet defaults are needed.
- `theme.ts` — `ExampleThemeVars` (background, borderColor, `padding:
  ThemeVarValue`) augmented into `NoobUiThemeComponents`; the file's own JSDoc
  still says "Card" / `useUiTheme("Card")` — a stale comment left from the
  `UiCard` → `Example` rename (the code reads `"Example"`).
- `i18n.ts` — `NoobUiExampleLocale` from the generated `LocaleFileMap`,
  augmented into `NoobUiLocale`.
- `locales/Example.json` — en/zh-CN `title`/`description` messages (the
  generated `src/locales/locale-types.generated.ts` derives the message type).

## `CardTabs` (`components/card-tabs/`)

A connected segmented tab bar whose layout mirrors the reference demo: a CSS
grid whose column template is `repeat(<scopeCount>, gap inner 1fr inner) gap`,
each scope a `grid-cols-subgrid` card positioned via a runtime `col-start` CSS
var. Real tabs get a `1fr` body column; empty head/tail sentinels collapse to a
`0` body track.

- `Root` (`root.tsx`, `COMPONENT_ID = "CardTabs"`, name `CardTabsRoot`) — renders
  the scroll container + grid, owns the shared tab controller
  (`useTabController`), bar-level Arrow/Home/End keyboard navigation, and the
  themeVars via `useUiTheme("CardTabs", getThemeDefaults)` where the defaults
  getter reads naive-ui `useThemeVars()` (active card color, hover colors,
  background, borders). The grid's `colTemplate`/`rowTemplate`/`nTabs` CSS vars
  are computed from the registered tabs. Slots: `head` / `tail` (placed at the
  bar ends; empty slots inject a default sentinel `Tab` with reserved keys
  `__noob-ui-card-tabs-head__` / `__noob-ui-card-tabs-tail__`) and `default`.
- `Tab` (`tab.tsx`, name `Tab` from the fn name — `defineOptions` is not part of
  the vue-jsx-vapor macro set) — one connected scope: registers with the shared
  controller on mount (DOM-position ordered), derives `status` (active/inactive),
  `neighbor` (none/left/right relative to the active tab), and the
  `col-start` (4·index+1), and renders the `tailwind-variants` class matrix
  across `status`/`mode`/`neighbor` axes with `$tw`-driven runtime var utilities
  (e.g. `bg-(--noob-ui-card-tabs-active-card-color)`).
- `runtime.ts` — `useTabController({ activeKey, handleClick })`
  provide/inject controller: a reactive `tabList` ordered by DOM
  `compareDocumentPosition` (sorted binary-insertion keeps O(log n)
  registration), register/unregister with duplicate-key protection, and
  `elementOf` for focus moves. Requires a `Root` ancestor or explicit options
  (throws otherwise).

`AdminShellTabbar` consumes `CardTabs.Root`/`CardTabs.Tab` as its tab strip
<!-- openwiki: broken internal link [../admin/shell.md] file "../admin/shell.md" does not exist. Fix the href or restore the target, then delete this comment. -->
([admin shell](../admin/shell.md)).

## Stylesheet (`src/style.css`)

Tailwind v4 CSS: `@layer theme, base, components, utilities;` with
`@source "./components"` (scanned by the workspace Tailwind build). Exported as
`./style.css` subpath with `sideEffects: ["**/*.css"]`; the admin stylesheet
re-imports it (`@import "@noob-naive-ui/ui/style.css"`). There is no preflight
and no `.ui-card` block anymore — components bind their defaults inline via
`useUiTheme` (see [build pipeline](../architecture/overview.md)).

## Tests — `packages/ui/tests/use-ui-theme.test.tsx`

happy-dom suite (4 `it`) covering `useUiTheme` + `AdminUiConfigProvider`:

- binds a camelCase `Example` override as the converted `--noob-ui-example-…`
  CSS var, merged over defaults;
- renders provider-less defaults as inline CSS vars;
- resolves size-keyed vars against the injected font-size tier (`themeFontSizeKey`,
  default `"medium"` when no provider);
- keeps camelCase names in the typed override surface;
- type-level: raw `--noob-ui-…` names and unknown camelCase names are rejected at
  the host boundary; with defaults the output is never `undefined`.

Narrowest validation: `pnpm --filter @noob-naive-ui/ui test`, plus
`pnpm --filter @noob-naive-ui/ui typecheck` after type-level changes.

## Related

<!-- openwiki: broken internal link [../registry.md] file "../registry.md" does not exist. Fix the href or restore the target, then delete this comment. -->
- [registry package](../registry.md) — `libraryOverridesKey`, `useTheme`,
  `themeFontSizeKey`, `ThemeVarValue`
<!-- openwiki: broken internal link [../i18n.md] file "../i18n.md" does not exist. Fix the href or restore the target, then delete this comment. -->
- [i18n package](../i18n.md) — `createComponentI18n` for the Example locale
<!-- openwiki: broken internal link [../admin/shell.md] file "../admin/shell.md" does not exist. Fix the href or restore the target, then delete this comment. -->
- [admin shell](../admin/shell.md) — `AdminShellTabbar` consumes `CardTabs`
<!-- openwiki: broken internal link [../admin/provider.md] file "../admin/provider.md" does not exist. Fix the href or restore the target, then delete this comment. -->
- [Admin root provider](../admin/provider.md) — `AdminProvider` mounts
  `AdminUiConfigProvider` and provides `themeFontSizeKey`
<!-- openwiki: broken internal link [../../apps/demo.md] file "../../apps/demo.md" does not exist. Fix the href or restore the target, then delete this comment. -->
- [Demo host](../../apps/demo.md) — `InternationalizationDemoPage` renders
  `Example`