# Design — theme presets + navbar theme dropdown

## Shape
```ts
// runtime-contract.ts
export type AdminThemePreset = {
  key: string;
  label: I18nText;                 // resolveI18nText(label, t) at render time
  naiveUiConfig: GlobalThemeOverrides; // preset color overrides
  fontSizeOverrides?: Record<AdminFontSize, GlobalThemeOverrides>; // replaces FONT_SIZE_OVERRIDES per tier
  isDark: boolean;                 // polarity → base darkTheme|null
};
export type AdminShellPreferences = {
  themeMode: AdminThemeMode;       // unchanged
  themeKey: string;                // NEW persisted last-picked preset key, "" default
  fontSize; locale; availableLocales; sidebarCollapsed;
};
```

## Where each concern lives
- `runtime-contract.ts`: public `AdminThemePreset` + `themeKey` field.
- `runtime/shell-preferences.ts`: `themeKey` in normalize/persist/default/clone.
  `themeKeyInputSchema = z.string().catch("").default("")` (missing/corrupt → `""`).
- `runtime/naive-ui-config.ts`: new `resolveThemePreset(...)` pure resolver +
  `mergeAdminNaiveUiThemeOverrides(size, preset)` built on **es-toolkit `merge`** (no manual
  deep merge). `fontBase = preset.fontSizeOverrides?.[size] ?? FONT_SIZE_OVERRIDES[size]`;
  `merge(merge({}, preset.naiveUiConfig), fontBase)` so the font layer (preset-provided or
  built-in) wins over values the preset sets directly in `naiveUiConfig`.
- `stores/shell-preferences.ts`: runtime-only fields `themes: AdminThemePreset[]`,
  `defaultTheme: string`, `defaultDarkTheme: string` (host-configured, never serialized —
  like `fallbackLocale`). **No semantic setter is added** (the store stays an opaque blob
  holder): the composable's `configureThemePresets` writes the raw runtime fields, matching
  how `setSystemUsesDark` already writes `runtime.systemUsesDark`.
- `use-admin-provider.ts`: `toRef` the three runtime fields; add `activeTheme`
  `ComputedRef<AdminThemePreset|undefined>`, `setTheme(key)` + `configureThemePresets`
  actions, and rewire `naiveUiConfig` to use `resolveThemePreset` +
  `mergeAdminNaiveUiThemeOverrides` (deep merge of font-size + preset overrides).
- `components/admin-provider.tsx`: props change + call `setThemePresets`.
- `components/admin-shell-navbar-controls.tsx`: NDropdown of presets replacing the toggle.
- `locales/AdminShell.json`: `aria.theme` ("Theme: {label}"); remove `aria.themeLight/themeDark`.

## Resolution (`resolveThemePreset`)
```
isDark = mode==="dark" || (mode==="system" && systemUsesDark)
1. mode !== "system"  → themes.find(key===themeKey && isDark===isDark)   // picked preset
2. defaultKey = isDark ? defaultDarkTheme : defaultTheme
   → themes.find(key===defaultKey && isDark===isDark)
3. → themes.find(isDark===isDark)                                        // first of polarity
4. → undefined
```
Empty `themes` → `undefined` → `naiveUiConfig` falls back to
`resolveDefaultNaiveUiTheme(themeMode, systemUsesDark)` and `FONT_SIZE_OVERRIDES[fontSize]`
(current behavior). When a preset exists: `theme = preset.isDark ? darkTheme : null`,
`themeOverrides = { ...FONT_SIZE_OVERRIDES[fontSize], ...preset.naiveUiConfig }`.

## setTheme
```ts
function setTheme(key) {
  const preset = themes.value.find(p => p.key === key);
  if (!preset) return;
  store.preferences.themeKey = key;
  store.preferences.themeMode = preset.isDark ? "dark" : "light";
}
```

## Navbar dropdown
`NDropdown trigger="hover"`, `value = activeTheme?.key`, `options = themes.map(p => ({ key, label: resolveI18nText(p.label, t) }))`,
`disabled` when empty, `onSelect` → `setTheme(key)`. Trigger `NButton` circle with
`ColorPaletteOutline` icon, `data-admin-control="theme"`, `aria-label={t("aria.theme", { label }) }`.

## Demo presets (apps/demo/src/App.tsx)
Provide `defaultTheme` (light) + `defaultDarkTheme` (dark) keys. Define 4–5 presets across
both polarities (e.g. Default light/dark, a blue-slate light, an ocean/indigo dark,
a warm solarized light). Labels are i18n `I18nText` keys (`themes.<key>` in `demo.json`,
en + zh-CN) resolved reactively against the host global Composer via the admin component
Composer's `fallbackRoot`.
