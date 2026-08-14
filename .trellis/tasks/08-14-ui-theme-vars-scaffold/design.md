# Design — unified library override mechanism (i18n + themeVars)

## 0. Problem

The i18n mechanism is already a clean namespaced override seam; themeVars should ride the **same** seam, not a parallel one. Per-package ConfigProviders must be standalone-capable while `AdminProvider` aggregates them in its render function. Exact per-component themeVar names must survive in type info.

## 1. Existing i18n mechanism (the template, verified in source)

`packages/i18n/src/library-i18n-descriptor.ts`:

- **Registry**: `libraryI18nOverridesKey: InjectionKey<LibraryI18nOverridesRegistry>` where `LibraryI18nOverridesRegistry = { [libraryId: string]: unknown }`. Single key shared by all packages; consumers look up their own `libraryId`.
- **Per-package typed descriptor**: `LibraryI18nDescriptor<LocaleName, Locale> = { libraryId: string; readonly __i18n?: LibraryI18nOverrides<...> }` — the `__i18n` brand pins the schema at type level only.
- **Component selector**: `selectComponentOverrides(messages, componentId)`.
- **Provider**: `AdminProvider.overrides?: LibraryI18nOverridesRegistry`, `provide(libraryI18nOverridesKey, { [libraryId]: structuredClone(entry) })`.
- **Component-side pull** (`use-component-i18n.ts`): `createComponentI18n` → `inject` → `registry[libraryId]` (emptySnapshot fallback) → `selectComponentOverrides(componentId)` → merge into a fresh local Composer.

naive-ui's themeVars typing (`es/card/styles/light.d.ts` + `es/_mixins/use-theme.d.ts`): `CardThemeVars = ReturnType<typeof self>`; `ExtractThemeOverrides<T> = Partial<ExtractThemeVars<T>>`. Exact names survive because the vars type is a concrete object-literal type.

## 2. Unified registry (breaking, in the i18n package)

Two registry types, distinct roles:

```ts
/** Host-facing, i18n-only per-library registry (AdminProviderProps.i18nOverrides). */
export type LibraryI18nOverridesRegistry = { [libraryId: string]: unknown }; // i18n tree per library, RETAINED

/** Internal injection value: both kinds, one entry per library. */
export type LibraryOverridesRegistry = {
  [libraryId: string]: {
    i18n?: unknown;   // typed per-package at consumption (LibraryI18nOverrides<...>)
    theme?: unknown;  // typed per-package at consumption (LibraryThemeOverrides<...>)
  };
};
export const libraryOverridesKey: InjectionKey<ComputedRef<LibraryOverridesRegistry>>;
```

- `libraryI18nOverridesKey` → `libraryOverridesKey` (the injection key now carries both kinds as `ComputedRef`). **`LibraryI18nOverridesRegistry` (i18n-only) is retained** under its original name for `AdminProviderProps.i18nOverrides`.
- Provided value becomes `ComputedRef` (naive-ui's `mergedThemeOverridesRef` pattern) — providers `provide(computed(...))`, consumers `inject(key, null)` + optional chaining. All test harnesses wrap in `computed`.
- `createComponentI18n` reads `registry?.value?.[descriptor.libraryId]?.i18n ?? emptySnapshot`.

Theme trio (mirror the i18n trio):
```ts
export type LibraryThemeOverrides<Components extends Record<string, unknown>> = {
  [K in keyof Components]?: Partial<Components[K]>;
};
export type LibraryThemeDescriptor<Components extends Record<string, unknown>> = {
  libraryId: string;
  readonly __theme?: LibraryThemeOverrides<Components>; // type-level brand only
};
export function selectComponentThemeOverrides<Components, ComponentId extends keyof Components & string>(
  overrides: LibraryThemeOverrides<Components>, componentId: ComponentId,
): Partial<Components[ComponentId]>;
```

## 3. `AdminThemePreset` — per-library themeOverrides

```ts
export type AdminPresetThemeOverrides = {
  "naive-ui"?: GlobalThemeOverrides;
  "pro-naive-ui"?: GlobalThemeOverrides;   // forwards GlobalThemeOverrides to naive-ui's NConfigProvider (verified pass-through); merges into the same themeOverrides as naive-ui
  "noob-naive-ui:admin"?: AdminThemeOverrides;
  "noob-naive-ui:ui"?: NoobUiThemeOverrides;   // import type from @noob-naive-ui/ui
  [libraryId: string]: unknown;              // 3rd-party libraries
};
export type AdminThemeComponents = {};        // open registry, empty until admin ships theme components
export type AdminThemeOverrides = LibraryThemeOverrides<AdminThemeComponents>;
export type AdminThemePreset = {
  key: string;
  label: I18nText;
  isDark: boolean;
  themeOverrides: AdminPresetThemeOverrides;
  fontSizeOverrides?: Record<AdminFontSize, GlobalThemeOverrides>;
};
```

`naiveUiConfig` field **removed**. `mergeAdminNaiveUiThemeOverrides(size, preset)` reads `preset.themeOverrides["naive-ui"]` + `preset.themeOverrides["pro-naive-ui"]` (colorBase) merged with the font-size tier (fontBase stays the source, so the built-in tier wins over preset font values as today). `fontSizeOverrides` stays a naive-ui-only font-tier layer, NOT part of the unified registry.

## 4. Providers — per-package standalone + AdminProvider aggregator

### Shared layering pattern (naive-ui NConfigProvider model)

Each ConfigProvider: `inject(libraryOverridesKey, null)` → `merge({}, parent?.value ?? {}, ownSlice)` → `provide(computed(merged))`. `inject` returns `null` outside a provider → own slice only (standalone use). Nearest provider wins for its subtree.

### `AdminConfigProvider` (admin) / `AdminUiConfigProvider` (ui)

Per-package typed props, standalone-capable:
```ts
export interface AdminConfigProviderProps {
  i18n?: AdminLocaleOverrides;       // LibraryI18nOverrides<AdminLocaleName, AdminLocale>
  themeOverride?: AdminThemeOverrides; // empty seam until admin ships theme components
}
export interface AdminUiConfigProviderProps {
  i18n?: NoobUiLocaleOverrides;
  themeOverride?: NoobUiThemeOverrides;
}
```
Each provides `{ [libraryId]: { i18n: props.i18n, theme: props.themeOverride } }` merged over the parent registry.

### `AdminProvider` (aggregator)

Keeps an i18n-only prop renamed `overrides` → `i18nOverrides?: LibraryI18nOverridesRegistry` (bare per-library i18n trees — it does not concern theme overrides). **AdminProvider does NOT provide the registry** — it is the aggregator only: its render passes per-package `i18n` + `themeOverride` values to the ConfigProviders mounted internally, which provide their own slices (nearest-wins layering). Theme overrides flow exclusively through the active preset's `themeOverrides` (re-passed reactively on theme change, driving the ConfigProvider `themeOverride` props). The `i18n` reads MUST be boundary-cast `as …LocaleOverrides | undefined`: `props.i18nOverrides` values are `unknown`, and the ConfigProvider `i18n` prop is per-package typed — `unknown` is not assignable. Cast only at the prop boundary (registry stays loose):
```tsx
return () => (
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
);
```
The naive-ui/pro-naive-ui preset theme does NOT enter the registry — it feeds `naiveUiConfig.themeOverrides` (prop-driven via ProConfigProvider), the visual path. The registry carries only the admin + ui slices provided by the ConfigProviders.

## 5. ui package — theme typing, composable, proof component

### `src/theme/types.ts`
```ts
export interface UiThemeComponents { Card: UiCardThemeVars; } // extend per component
export type NoobUiThemeOverrides = LibraryThemeOverrides<UiThemeComponents>;
export const noobUiTheme: LibraryThemeDescriptor<UiThemeComponents> = { libraryId: "noob-naive-ui:ui" };
```
(`UiCardThemeVars` imported type-only from `../card/ui-card`; no runtime cycle.)

### `src/theme/use-ui-theme.ts`
```ts
export function useUiTheme<const K extends keyof UiThemeComponents>(componentId: K) {
  const registry = inject(libraryOverridesKey, null);
  return computed<Partial<UiThemeComponents[K]> | undefined>(() =>
    registry?.value?.[noobUiTheme.libraryId]?.theme?.[componentId] as Partial<UiThemeComponents[K]> | undefined);
}
```
The `as … | undefined` cast is required at the registry read boundary: `.theme` is `unknown` (`LibraryOverridesRegistry` entry) and indexing `unknown` is a TS error. It does NOT weaken exact-`--n-*` typing — that rejection lives at the host boundary (`NoobUiThemeOverrides` prop). Provider-less → `undefined` → component falls back to own defaults; no throw.

### `src/card/ui-card.tsx` (proof)
```tsx
export type UiCardThemeVars = {
  "--ui-card-bg": string;
  "--ui-card-border-color": string;
  "--ui-card-padding": string;
};
export const UiCard = defineComponent({
  name: "UiCard",
  setup(_, { slots }) {
    const overrides = useUiTheme("Card");
    const style = computed(() => overrides.value ?? {});
    return () => <div class="ui-card" style={style.value as CSSProperties}>{slots.default?.()}</div>;
  },
});
```
`import type { CSSProperties } from "vue"`. The `as CSSProperties` cast is required: csstype is 3.0.11, whose `Properties` has NO `--${string}` index signature, so `Partial<UiCardThemeVars>` (literal `--ui-card-*` keys) is not assignable to Vue `StyleValue`. Cast only at the binding. `.ui-card` default `--ui-card-*` values go in `packages/ui/src/style.css` (package-owned compiled CSS; provider-less renders with defaults, Contract #10).

### ui build/test plumbing
`packages/ui/vite.config.ts`: `defineConfig` from `"vitest/config"`, add `vueJsx()`, add `test: { environment: "happy-dom", include: ["tests/**/*.test.{ts,tsx}"] }`. `packages/ui/package.json`: `"test": "vitest run"`. tsconfig (grounded): `packages/ui/tsconfig.json` ALREADY includes `tests/**/*.tsx` — NO change; only `tsconfig.build.json` needs `src/**/*.tsx` (its `include: ["src/**/*.ts"]`). JSX compiles via inherited root config (`jsx: "preserve"` + `jsxImportSource: "vue"`, verified).

## 6. Public surface

- `packages/i18n/src/index.ts`: rename `libraryI18nOverridesKey` → `libraryOverridesKey`; **keep `LibraryI18nOverridesRegistry`** (i18n-only, for `AdminProviderProps.i18nOverrides`); add `LibraryOverridesRegistry`, `LibraryThemeOverrides`, `LibraryThemeDescriptor`, `selectComponentThemeOverrides`.
- `packages/admin/src/index.ts`: add `AdminConfigProvider`, `AdminConfigProviderProps`.
- `packages/ui/src/index.ts`: add `AdminUiConfigProvider`, `useUiTheme`, `UiCard`, `UiCardThemeVars`, `NoobUiThemeOverrides`, `UiThemeComponents`, `noobUiTheme`; keep existing i18n exports.

## 7. Compatibility & risks

- **Breaking registry key rename + `AdminThemePreset.naiveUiConfig` removal + `AdminProvider.overrides` → `i18nOverrides`** — intentional (PRD). Clean cutover, no aliases. `LibraryI18nOverridesRegistry` retained (i18n-only host type).
- **i18n-only AdminProvider prop**: theme overrides flow only via `AdminThemePreset.themeOverrides` (and standalone ConfigProvider `themeOverride` props); `i18nOverrides` never carries theme.
- **Standalone + aggregated**: ConfigProviders used alone provide own slice; under AdminProvider they layer. No conflict (single key, nearest-wins merge).
- **`useUiTheme` optional-chaining** — provider-less components keep working (fall back to own defaults), unlike naive-ui's throwError.
- **Rollback**: coordinated revert of the registry key rename + preset field removal + prop rename (coupling points). No release before approval.
