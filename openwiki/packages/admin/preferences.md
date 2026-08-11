---
type: concept
title: Admin Shell Preferences and Naive UI Configuration
description: The persisted local display preferences store (theme mode, font size, locale, sidebar), its localStorage schema and hydration, and the derived NConfigProvider/ProLayout props.
tags: [admin, preferences, naive-ui, persistence]
---

# Admin Shell Preferences and Naive UI Configuration

`useAdminShellPreferencesStore` (`stores/shell-preferences.ts`) owns the
**local display preferences** rendered by the AdminShell navbar controls: theme
mode, font size, locale, and sidebar collapse. Persistence is a thin, defensive
localStorage layer in `runtime/shell-preferences.ts`; Naive UI theming is derived
in `runtime/naive-ui-config.ts`.

## Preference model

```ts
type AdminShellPreferences = {
  themeMode: "light" | "dark" | "system";
  fontSize: "small" | "medium" | "large";
  locale: string;
  availableLocales: AdminLocaleOption[];   // { key, label }
  sidebarCollapsed: boolean;
};
```

Defaults: `system` / `medium` / `en` / `[]` / `false`.

## Store behavior

- `initialize(options)` — call once by the host:
  - `defaults?: Partial<AdminShellPreferences>` (the demo passes
    `availableLocales` for en and zh-CN).
  - `storage?: AdminShellPreferencesStorage | null` — defaults to
    `globalThis.localStorage` when present (guarded, failure-safe); passing
    `null` disables persistence.
  - `fallbackLocale?: string` — host-owned naive-ui fallback locale
    (default `"en"`); runtime-only, never persisted.
  - Hydrates from storage without writing, then sets `isHydrated`.
- Mutators: `setThemeMode`, `setFontSize`, `setLocale`, `setAvailableLocales`
  (repairs an invalid active locale by falling back to the first option or the
  default), `setSidebarCollapsed`, `toggleSidebar`, `reset(defaults)`,
  `replacePreferences(partial)` (normalizes), and `setSystemUsesDark` — a
  **runtime-only browser dark-mode signal** fed by the host's `matchMedia`
  listener, never serialized.
- `preferences` computed returns a defensive copy of the preference snapshot.

### Persistence (`runtime/shell-preferences.ts`)

- Storage key: `"@noob-naive-ui/admin:shell-preferences"`.
- Persisted shape is a subset (`themeMode`, `fontSize`, `locale`,
  `sidebarCollapsed`); `availableLocales` and the system-dark signal are
  intentionally **not** persisted — locale options always come from host
  defaults.
- Hydration reads and validates with Zod; malformed/unparseable payloads are
  removed and defaults returned. Mutation persistence is wired through
  `store.$subscribe(..., { detached: true, flush: "sync" })` with an
  `enablePersistence` flag so hydration and `reset` never write back what they
  just read.
- All storage access is wrapped in try/catch (`safeGetItem`/`safeSetItem`/
  `safeRemoveItem`); adapter failures degrade to no persistence, never throw.
- `normalizeShellPreferences` is the single normalization gate: unknown/missing
  fields fall back to defaults via Zod `.catch`/`.default`.

## Derived Naive UI configuration (`runtime/naive-ui-config.ts`)

The store exposes two computed objects consumed by host and shell:

### `naiveUiConfig: AdminNaiveUiConfig` — for `<n-config-provider>`

- `theme`: `darkTheme` when the mode is `dark`, or when mode is `system` and the
  runtime `systemUsesDark` signal is true; otherwise `null` (light).
- `themeOverrides`: fixed per-font-size overrides from `FONT_SIZE_OVERRIDES`
  (common font sizes, Typography header sizes, Flex gaps; the 13/14/16px mapping
  lives in exactly one place).
- `locale`: `resolveAdminNaiveUiLocale(activeLocale, fallbackLocale)` maps
  `en` → `enUS`, `zh-CN` → `zhCN`; unsupported locales fall back to the
  host-owned fallback, then `null` (naive-ui keeps its built-in `enUS`).
- `componentOptions`: `COMPONENT_SIZE_OPTIONS[fontSize]` — naive-ui has no single
  global size knob, so every supported component's `size` option is set to the
  active tier (30+ components, from AutoComplete to TreeSelect).

The host binds it directly:
`<n-config-provider v-bind="preferences.naiveUiConfig">` (see
[demo App](../../apps/demo.md)). Because naive-ui sets `body { font-size: 14px }`
statically, the host additionally applies
`resolveAdminNaiveBaseFontSize(fontSize)` to its root element so `rem`-based
content scales with the preference.

### `proLayoutConfig: ProLayoutProps`

- Currently `{ collapsed: preferences.sidebarCollapsed }` — maps the collapse
  preference into pro-naive-ui's `ProLayout`. The tabbar container height follows
  the font-size tier so the shell's NTabs never overflow it (handled in shell
  CSS).

## Locale flow

The persisted preference locale is pushed **one way** into the host global
Composer by AdminShell's `useGlobalI18nSync(() => preferences.locale)`; the host
seeds the Composer at creation for the pre-auth login page. See
[i18n package](../i18n.md) and [Shell](shell.md).

## Tests

`packages/admin/tests/shell-preferences.test.ts`:
- hydrates defaults without browser storage;
- rehydrates persisted preferences and keeps locale options from defaults;
- writes only the persisted subset back to storage on mutation;
- drops malformed persisted payloads and falls back to defaults;
- derives `naiveUiConfig` runtime-only props from preferences;
- maps each font-size preference to its CSS base font size;
- treats storage adapter failures as no persistence.

## Related

- [Admin overview](overview.md)
- [Shell and page-instance state machine](shell.md) — navbar controls mutate
  these preferences
- [Demo host](../../apps/demo.md) — initialization and matchMedia wiring
