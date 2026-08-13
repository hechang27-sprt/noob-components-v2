# Support multiple theme presets in AdminProvider + theme dropdown

## Goal
Let a host pass **multiple named naive-ui theme presets** to `AdminProvider` and let the
navbar switch between them via a dropdown (replacing the current single dark/light toggle).
Each preset carries its own `GlobalThemeOverrides` and a light/dark polarity. Two default
keys (`defaultTheme` for light, `defaultDarkTheme` for dark) resolve the theme shown on
first load while the stored mode is `"system"` (follow OS). Add a small set of pre-defined
presets to the demo.

## Confirmed facts
- `AdminProviderProps.theme?: GlobalThemeOverrides` is a single static blob merged on top of
  the derived `themeOverrides` in the rendered `NConfigProvider`.
- `AdminShellPreferences` persists `themeMode: "light" | "dark" | "system"`; the derived
  `naiveUiConfig.theme` is `darkTheme | null` via `resolveDefaultNaiveUiTheme(themeMode, systemUsesDark)`.
- `AdminShellNavRight` renders a single circle button that toggles `themeMode` between
  `dark` and `light`.
- Presets must keep the persisted light/dark split: `defaultTheme`/`defaultDarkTheme`
  select the preset used when the mode is `"system"` (OS-light → light default, OS-dark →
  dark default).
- User decision: the dropdown lists **presets only** (no "System" entry). `"system"`
  remains the initial/default stored mode; once a preset is picked the mode pins to
  light/dark.

## Requirements
1. Add a public `AdminThemePreset` type:
   `{ key: string; label: I18nText; naiveUiConfig: GlobalThemeOverrides; isDark: boolean }`
   plus an optional `fontSizeOverrides?: Record<AdminFontSize, GlobalThemeOverrides>`
   letting a preset replace the built-in `FONT_SIZE_OVERRIDES` per size tier. Without
   `fontSizeOverrides`, the built-in hardcoded default font size takes precedence over any
   font-size values set directly in `naiveUiConfig`.
2. Change `AdminProviderProps`:
   - Remove `theme?: GlobalThemeOverrides`.
   - Add `themes?: AdminThemePreset[]`.
   - Add `defaultTheme?: string` and `defaultDarkTheme?: string` (preset keys).
3. Persist a new `themeKey: string` alongside `themeMode` (last picked preset; `""` default).
4. Derive the active preset: explicit picked preset matching the current polarity (light/dark
   mode), else the polarity default, else the first preset of that polarity; when `themes` is
   empty, fall back to the existing theme-mode-driven resolution.
5. `naiveUiConfig.theme` = `darkTheme | null` from the active preset's `isDark`;
   `naiveUiConfig.themeOverrides` = font-size overrides merged with the active preset's
   `naiveUiConfig`.
6. Replace the navbar toggle with an `NDropdown` listing all presets (reactive locale labels
   via `resolveI18nText`). Selecting a preset sets `themeKey` and pins `themeMode` by its
   `isDark`. Disabled when no presets.
7. Demo: define several pre-defined presets (light + dark) and wire them through props.
8. Preserve SSR/test-safe normalization and persistence boundaries; keep the runtime-only
   themes/defaults out of serialized preferences.

## Acceptance criteria
- [X] `AdminProvider` accepts `themes`/`defaultTheme`/`defaultDarkTheme`; empty `themes`
      preserves existing theme-mode behavior.
- [X] `useAdminProvider` exposes the preset list, the resolved active preset, and a
      `setTheme(key)` action; switching a preset re-pins mode and re-derives
      `naiveUiConfig` (theme + merged overrides).
- [X] `"system"` mode resolves to `defaultTheme` (OS light) / `defaultDarkTheme` (OS dark).
- [X] Navbar shows a theme dropdown; picking a preset updates the shell theme; the demo
      ships several working presets.
- [X] Admin unit tests (use-admin-provider, shell-preferences, admin-provider) pass;
      `pnpm --filter @noob-naive-ui/admin typecheck` and `pnpm --filter demo typecheck` pass.

## Out of scope
- A "System (follow OS)" entry in the dropdown (user decision: presets only).
- Persisting the themes themselves (host-owned runtime config, never serialized).
- Backend/routing/auth changes.
