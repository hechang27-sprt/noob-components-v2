# Implement — unified library override mechanism (i18n + themeVars) + AdminConfigProvider

Ordered, independently verifiable steps. Validate after each.

## Step 1 — Generalize the i18n registry to kind-namespaced entries (packages/i18n)

File `packages/i18n/src/library-i18n-descriptor.ts`:

- **Retain** `LibraryI18nOverridesRegistry = { [libraryId: string]: unknown }` (i18n-only host-facing type, used by `AdminProviderProps.i18nOverrides`).
- Add `LibraryOverridesRegistry = { [libraryId: string]: { i18n?: unknown; theme?: unknown } }` (internal injection value).
- Rename `libraryI18nOverridesKey` → `libraryOverridesKey`; value type becomes `ComputedRef<LibraryOverridesRegistry>`. Providers provide `computed(...)`; consumers read `.value` with `inject(key, null)` + optional chaining.
- Keep `DeepPartial`, `emptySnapshot` (frozen `{}` — shared fallback for both kinds), `selectComponentOverrides` unchanged.
- Add theme trio (same file or `library-theme-overrides.ts`): `LibraryThemeOverrides<Components>`, `LibraryThemeDescriptor<Components>`, `selectComponentThemeOverrides(overrides, componentId)` (as in design.md §2).
- `use-component-i18n.ts` `createComponentI18n`: read `registry?.value?.[descriptor.libraryId]?.i18n ?? emptySnapshot`; `inject(libraryOverridesKey, null)`.
- `packages/i18n/src/index.ts`: rename `libraryI18nOverridesKey` → `libraryOverridesKey`; **keep `LibraryI18nOverridesRegistry`** export; add `LibraryOverridesRegistry`, `LibraryThemeOverrides`, `LibraryThemeDescriptor`, `selectComponentThemeOverrides`.

**Migrate consumers (exact grep list — `libraryI18nOverridesKey` appears only in):**
- `packages/admin/src/components/admin-provider.tsx`
- `packages/admin/tests/admin-provider.test.tsx`
- `packages/admin/tests/i18n-contract.test.tsx`
- `packages/i18n/src/index.ts`, `packages/i18n/src/use-component-i18n.ts`, `packages/i18n/src/library-i18n-descriptor.ts`
- `packages/i18n/tests/use-component-i18n.test.tsx`, `packages/i18n/tests/library-i18n-descriptor.test.ts`

Tests: registry provides become `computed(() => ({ "test-library": { i18n: {...} } }))`; assertions read `.value`. Admin tests migrate in Step 3.

**Validate:** `pnpm --filter @noob-naive-ui/i18n typecheck`, `build`, `test`. Admin typecheck may be red until Step 3 — acceptable intermediate.

## Step 2 — Admin: `AdminThemePreset.themeOverrides` (per-library)

`packages/admin/src/runtime-contract.ts`:
- Remove `naiveUiConfig: GlobalThemeOverrides` from `AdminThemePreset`.
- Add `AdminPresetThemeOverrides`, `AdminThemeComponents`, `AdminThemeOverrides` (as in design.md §3). `AdminThemePreset` becomes `{ key; label; isDark; themeOverrides: AdminPresetThemeOverrides; fontSizeOverrides? }`.

`packages/admin/src/runtime/naive-ui-config.ts`:
- `mergeAdminNaiveUiThemeOverrides(size, preset)`: `fontBase = preset.fontSizeOverrides?.[size] ?? FONT_SIZE_OVERRIDES[size]`; `colorBase = merge({}, preset.themeOverrides["naive-ui"] ?? {}, preset.themeOverrides["pro-naive-ui"] ?? {})`; return `merge(colorBase, fontBase)`. Font layer stays the source.
- **pro-naive-ui slice is actively consumed, not reserved.** Verified: pro-naive-ui's `ProConfigProvider` omits only its extend props (`propOverrides`/`empty`) and forwards everything else to naive-ui's `NConfigProvider` — there is no separate pro-naive-ui theme channel; its `themeOverrides` is naive-ui `GlobalThemeOverrides` pass-through. So the `pro-naive-ui` slice merges into the same `naiveUiConfig.themeOverrides` as `naive-ui`. Document this in the `AdminPresetThemeOverrides` comment ("pro-naive-ui forwards GlobalThemeOverrides to naive-ui's NConfigProvider") — do NOT call it "reserved". Because the slice is typed `GlobalThemeOverrides`, a host cannot structurally inject `--pro-*`/ProLayout keys there.

**Migrate fixtures:** `packages/admin/tests/use-admin-provider.test.ts` presets `naiveUiConfig: {...}` → `themeOverrides: { "naive-ui": {...} }`; `fontSizeOverrides` unchanged. `packages/admin/tests/admin-provider.test.tsx` preset fixtures likewise.

**Validate:** admin typecheck (may be red until Step 3 for key rename + Step 4 for `NoobUiThemeOverrides` import; re-run once both land), run `use-admin-provider.test.ts`.

## Step 3 — Admin: `AdminProvider` aggregates ConfigProviders; new `AdminConfigProvider`

`packages/admin/src/components/admin-provider.tsx`:
- `AdminProviderProps.overrides` → **`i18nOverrides?: LibraryI18nOverridesRegistry`** (i18n-only; bare per-library i18n trees, no `{ i18n? }` wrapper).
- **AdminProvider does NOT provide the registry** — it is the aggregator only. Remove the old `structuredClone` `Object.fromEntries` provide + `libraryI18nOverridesKey` import; no `provide(libraryOverridesKey, …)` anywhere in AdminProvider.
- Render mounts `AdminConfigProvider` + `AdminUiConfigProvider` internally, passing per-package `i18n` + `themeOverride` values. Each `themeOverride` is sourced from `provider.activeTheme.themeOverrides?.[libraryId]` (the sole theme source, re-passed reactively on theme change); the ConfigProviders provide their own slices (nearest-wins). naive-ui/pro-naive-ui preset theme feeds `naiveUiConfig.themeOverrides` (visual path), NOT the registry. Wrapping `ProConfigProvider`/`NGlobalStyle`/slot:
```tsx
<AdminConfigProvider
  i18n={props.i18nOverrides?.[adminI18n.libraryId] as AdminLocaleOverrides | undefined}
  themeOverride={provider.activeTheme.value?.themeOverrides?.[adminI18n.libraryId]}
>
  <AdminUiConfigProvider
    i18n={props.i18nOverrides?.[noobUiI18n.libraryId] as NoobUiLocaleOverrides | undefined}
    themeOverride={provider.activeTheme.value?.themeOverrides?.[noobUiI18n.libraryId]}
  >
    <ProConfigProvider {...provider.naiveUiConfig.value}>
      <NGlobalStyle />
      {slots.default?.()}
    </ProConfigProvider>
  </AdminUiConfigProvider>
</AdminConfigProvider>
```
  The `i18n` reads MUST be boundary-cast `as …LocaleOverrides | undefined`: `props.i18nOverrides` values are `unknown` (`LibraryI18nOverridesRegistry`), and `AdminConfigProviderProps.i18n` is typed per-package — `unknown` is not assignable. Casting only at the prop boundary preserves the loose registry.

New `packages/admin/src/components/admin-config-provider.tsx`: per-package props (`i18n?: AdminLocaleOverrides`, `themeOverride?: AdminThemeOverrides`), inject-merge-reprovide pattern (as in design.md §4). **Declare `props:` in the `defineComponent` options** — the function-form `defineComponent(fn, { name })` without a `props` option lets attributes fall through to attrs (props become undefined). Export `AdminConfigProvider`, `AdminConfigProviderProps` from `packages/admin/src/index.ts`.

Tests: `admin-provider.test.tsx` — `i18nOverrides` passed to `AdminProvider` only; descendants see the merged registry (admin i18n + a ui theme entry from the preset survive layering); a theme-switch reactivity test asserts the ui `themeOverride` slice re-provides when the active preset changes (probe must read the registry INSIDE the render, not capture at setup). `i18n-contract.test.tsx` — i18n override entries bare per-library trees via `i18nOverrides`. Add one test mounting `AdminConfigProvider` standalone (no `AdminProvider`) asserting its slice is provided and the merged value contains only the admin libraryId.

**Validate:** admin typecheck, run admin tests.

## Step 4 — ui package: theme typing, `useUiTheme`, `AdminUiConfigProvider`

New `packages/ui/src/theme/types.ts`: `UiThemeComponents` (open interface, `Card: UiCardThemeVars`), `NoobUiThemeOverrides = LibraryThemeOverrides<UiThemeComponents>`, `noobUiTheme: LibraryThemeDescriptor<UiThemeComponents>` (`libraryId: "noob-naive-ui:ui"`). Type-only `import type { UiCardThemeVars } from "../card/ui-card"`.

New `packages/ui/src/theme/use-ui-theme.ts`: `useUiTheme<const K extends keyof UiThemeComponents>(componentId)` → `computed<Partial<UiThemeComponents[K]> | undefined>(() => registry?.value?.[noobUiTheme.libraryId]?.theme?.[componentId] as Partial<UiThemeComponents[K]> | undefined)`. The `as … | undefined` cast is required at the registry read boundary: `.theme` is `unknown` (`LibraryOverridesRegistry` entry), and indexing `unknown` with `[componentId]` is a TS error. This mirrors `createComponentI18n`'s boundary cast; it does NOT weaken Contract #3 — the exact-`--n-*` rejection lives at the host boundary (`NoobUiThemeOverrides` prop), not the style binding (as in design.md §5).

New `packages/ui/src/theme/admin-ui-config-provider.tsx`: `AdminUiConfigProvider` — per-package props (`i18n?: NoobUiLocaleOverrides`, `themeOverride?: NoobUiThemeOverrides`), inject-merge-reprovide (as in design.md §4). Export from `packages/ui/src/index.ts`.

**Validate:** ui typecheck, ui build (requires Step 5 for `.tsx` build support).

## Step 5 — ui build/test plumbing + proof `UiCard`

- `packages/ui/vite.config.ts`: `defineConfig` from `"vitest/config"`, add `vueJsx()` plugin, add `test: { environment: "happy-dom", include: ["tests/**/*.test.{ts,tsx}"] }`.
- `packages/ui/package.json`: add `"test": "vitest run"`.
- New `packages/ui/src/card/ui-card.tsx`: `UiCardThemeVars` (literal keys), `UiCard` (as in design.md §5). Register `Card` in `UiThemeComponents`. Export `UiCard`, `UiCardThemeVars` from `packages/ui/src/index.ts`.
- **tsconfig (grounded):** `packages/ui/tsconfig.json` ALREADY includes `src/**/*.ts` + `tests/**/*.ts` + `tests/**/*.tsx` — NO change there. Only `packages/ui/tsconfig.build.json` (`include: ["src/**/*.ts"]`, rootDir src, outDir dist) needs `src/**/*.tsx` added so `ui-card.tsx`/`admin-ui-config-provider.tsx` emit declarations. JSX compiles via inherited root config: `tsconfig.json` sets `jsx: "preserve"` + `jsxImportSource: "vue"` (verified) and already includes `packages/*/src/**/*.tsx` + `packages/*/tests/**/*.tsx`; no per-package jsx change needed.
- **UiCard fallback + csstype (grounded):** csstype is 3.0.11 — `Properties` has NO `--${string}` template-literal index, so `Partial<UiCardThemeVars>` (literal `--ui-card-*` keys) is NOT assignable to Vue `StyleValue`. Cast only at the binding: `style={style.value as CSSProperties}` (`import type { CSSProperties } from "vue"`). Add `.ui-card` default CSS vars to `packages/ui/src/style.css` (exists; ui is package-owned compiled CSS imported at `index.ts:1`, exported as `./style.css` → `dist/style.css`) so a provider-less `UiCard` renders with defaults (Contract #10): `.ui-card { --ui-card-bg: <default>; --ui-card-border-color: <default>; --ui-card-padding: <default>; }`. Inline defaults are wrong (duplicate vars per-instance).

**Validate:** ui typecheck, build, test.

## Step 6 — Demo migration + type-level proof

- `apps/demo/src/themes.ts`: `preset()` helper `{ key, label, naiveUiConfig: overrides, isDark }` → `{ key, label, themeOverrides: { "naive-ui": overrides }, isDark }` (LIGHT_ACCENT/DARK_ACCENT unchanged).
- `apps/demo/src/App.tsx`: pass everything through `AdminProvider` — no manual ConfigProvider composition; admin i18n passed via `i18nOverrides` as bare per-library trees (unchanged entry shape from today, `satisfies AdminLocaleOverrides`):
```tsx
<AdminProvider
  messages={demoMessages}
  menu={createDemoMenu()}
  storeOptions={...}
  themes={demoThemePresets}
  defaultTheme={demoDefaultTheme}
  defaultDarkTheme={demoDefaultDarkTheme}
  i18nOverrides={{
    "noob-naive-ui:admin": {
      en: { AdminShell: { account: { signOut: "Log out" } } },
      "zh-CN": { AdminShell: { account: { signOut: "退出" } } },
    } satisfies AdminLocaleOverrides,
  }}
>
  <RouterView />
</AdminProvider>
```
- New `packages/ui/tests/use-ui-theme.test.tsx` (happy-dom):
  1. Type-level: `const o: NoobUiThemeOverrides = { Card: { "--ui-card-bg": "red" } };` compiles; `// @ts-expect-error` on unknown key.
  2. Runtime: mount `AdminUiConfigProvider` with `themeOverride={{ Card: { "--ui-card-bg": "red" } }}` + `UiCard`; assert root `style` contains `--ui-card-bg: red`; provider-less → no style vars.

**Validate:** ui test; demo typecheck (confirm script name via `apps/demo/package.json`; expected `"typecheck"`).

## Step 7 — Full verification

- `pnpm --filter @noob-naive-ui/i18n typecheck && build && test`
- `pnpm --filter @noob-naive-ui/ui typecheck && build && test`
- `pnpm --filter @noob-naive-ui/admin typecheck && test`
- grep repo (excluding `dist`) for stale `libraryI18nOverridesKey` — zero hits; `AdminProvider` `overrides` prop usage (should be `i18nOverrides`) — zero hits; `preset.naiveUiConfig` / `naiveUiConfig:` in preset literals/fixtures — zero hits (the removed preset FIELD). `naiveUiConfig` as the composable's derived config (`use-admin-provider.ts` computed, `provider.naiveUiConfig.value`, `api.naiveUiConfig.value.*` test assertions) legitimately SURVIVES — do not grep it bare.

## Review gates

- Before Step 2: Step 1 green (registry + i18n migration).
- Before Step 3: Steps 1–2 green (registry + preset shape).
- Before Step 4: Steps 1–3 green (registry + providers).
- Before Step 6: Steps 3–5 green (providers + proof component).
- Final: Step 7 all green; acceptance criteria in `prd.md` met.

## Rollback

Coordinated revert of Steps 1–7 (registry shape + key rename + preset field removal are the coupling points). No release shipped before approval.
