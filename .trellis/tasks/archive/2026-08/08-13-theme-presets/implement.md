# Implement — theme presets + dropdown

Order (contract first, then UI, then demo, then verify):

1. **runtime-contract.ts** — add `AdminThemePreset` (import `I18nText`, `GlobalThemeOverrides`);
   add `themeKey: string` to `AdminShellPreferences`.
2. **runtime/shell-preferences.ts** — `DEFAULT_THEME_KEY = ""`; `themeKeyInputSchema`;
   add `themeKey` to normalized schema, transform output, persisted schema, defaults,
   and `createDefaultAdminShellPreferences`.
3. **stores/shell-preferences.ts** — extend `AdminShellPreferencesRuntime` with
   `themes`/`defaultTheme`/`defaultDarkTheme`; init empties; add `setThemePresets`.
4. **runtime/naive-ui-config.ts** — add `resolveThemePreset` (pure). Re-export `AdminThemePreset`
   type if referenced.
5. **use-admin-provider.ts** — `toRef` themes/defaults; `activeTheme` computed;
   `setTheme`; rewire `naiveUiConfig`; add `themes` + `activeTheme` + `setTheme` to API;
   add `themeKey` to `preferencesSnapshot`.
6. **components/admin-provider.tsx** — replace `theme` prop with `themes`/`defaultTheme`/
   `defaultDarkTheme`; call `setThemePresets`; drop the `props.theme` overrides merge in the
   render (preset merge now lives in `naiveUiConfig`).
7. **components/admin-shell-navbar-controls.tsx** — theme NDropdown replacing the toggle;
   `ColorPaletteOutline` icon; `resolveI18nText` labels; `data-admin-control="theme"`.
8. **locales/AdminShell.json** — add `aria.theme`; remove `aria.themeLight`/`aria.themeDark`.
9. **apps/demo/src/App.tsx** — define presets + defaults; pass via props.
10. **Tests** — `use-admin-provider.test.ts` (preset resolution + setTheme + fontSizeOverrides + builtin-font precedence + snapshot shape),
    `shell-preferences.test.ts` (themeKey normalize/persist), `admin-provider.test.tsx`
    (new props pass-through).
11. Verify: `pnpm --filter @noob-naive-ui/admin typecheck`, admin tests, `pnpm --filter demo typecheck`,
    browser-verify dropdown. Update openwiki preferences doc + spec note + journal.
