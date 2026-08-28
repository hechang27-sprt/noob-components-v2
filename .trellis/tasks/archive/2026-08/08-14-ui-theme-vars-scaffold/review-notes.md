# Design grilling notes — unified override mechanism (i18n + themeVars)

Task: `.trellis/tasks/08-14-ui-theme-vars-scaffold/` (planning phase).
Baseline plan: `local://unified-override-registry-plan.md` + `prd.md`/`design.md`/`implement.md`.
This note records the adversarial review round (2026-08-14) and its settled remedies.

## Purpose

Continuity for the design grilling on the unified library override mechanism. The four plan artifacts are authoritative; this note captures what the adversarial reviewer surfaced, what was settled, and what remains open.

## Current settled direction

- Framework-wide override registry in `@noob-naive-ui/registry` (not i18n): `LibraryOverridesRegistry` augmentation point (naive-ui/pro-naive-ui preseeded as `GlobalThemeOverrides`); packages declare FULL `locale`/`theme` types via module augmentation; derived `RegistryI18nOverrides` (DeepPartial) / `RegistryThemeOverrides` (per-component partial) convert internally; `LibraryThemeOverrides` internal. `libraryOverridesKey: ComputedRef<LibraryOverridesRegistryValue>`. `LibraryI18nOverridesRegistry` eliminated; `AdminProviderProps.i18nOverrides = RegistryI18nOverrides`; `AdminPresetThemeOverrides = RegistryThemeOverrides`.
- `AdminProviderProps.overrides` → `i18nOverrides` (i18n-only, bare per-library i18n trees). Theme presets are the sole themeVar-override source.
- `AdminProvider` aggregates: render mounts `AdminConfigProvider` + `AdminUiConfigProvider`, each `themeOverride` from `provider.activeTheme.themeOverrides?.[lib]`, `i18n` from `props.i18nOverrides?.[lib]`.
- Per-package ConfigProviders standalone-capable (inject null → own slice), nearest-wins layering.
- Scope: mechanism + both providers + ONE proof component (`UiCard`). Real widgets + preset-dropdown wiring are follow-ups.

## Research notes (grounded this session)

- pro-naive-ui@3.2.3 `ProConfigProvider` (es/config-provider/config-provider.js): omits only `proConfigProviderExtendProps` (`propOverrides`/`empty`) via `useOmitProps`, forwards everything else to naive-ui `NConfigProvider`. NO separate pro-naive-ui theme channel; its `themeOverrides` IS naive-ui `GlobalThemeOverrides` pass-through. → its preset slice merges into the same `naiveUiConfig.themeOverrides` as `naive-ui` (not "reserved").
- csstype is 3.0.11 — `Properties` has NO `--${string}` template-literal index → `Partial<UiCardThemeVars>` (literal `--ui-card-*` keys) is NOT assignable to Vue `StyleValue`; `as CSSProperties` cast at the binding is required.
- `packages/ui/tsconfig.json` ALREADY includes `tests/**/*.tsx`; only `tsconfig.build.json` (`include: ["src/**/*.ts"]`) needs `src/**/*.tsx`. Root tsconfig has `jsx: "preserve"` + `jsxImportSource: "vue"` and already globs `packages/*/src/**/*.tsx` + `packages/*/tests/**/*.tsx`.
- `naiveUiConfig` survives as the composable's derived config (`use-admin-provider.ts` computed, `provider.naiveUiConfig.value`, ~12 `api.naiveUiConfig.value.*` test assertions); only the `AdminThemePreset.naiveUiConfig` FIELD is removed.
- `packages/ui/src/style.css` exists (package-owned compiled CSS, imported at `index.ts:1`, exported `./style.css` → `dist/style.css`) — correct home for `.ui-card` default vars.

## Open risks / assumptions

- **Unknown→typed boundary casts**: `props.i18nOverrides` values are `unknown`; render `i18n` reads and `useUiTheme` reads must cast `as XxxLocaleOverrides | undefined` / `as Partial<UiThemeComponents[K]> | undefined` at the boundary. Assumption: this does NOT weaken exact-`--n-*` rejection, which lives at the host `NoobUiThemeOverrides` boundary, not the style binding.
- **Provider-less fallback** (Contract #10): `UiCard` provider-less renders `.ui-card` defaults from style.css. Assumption: ui emits+exports its own compiled CSS (repo convention), so consumers of the ui package import it.
- **pro-naive-ui slice** is actively merged (not reserved) — a host cannot structurally inject `--pro-*` keys (slice is typed `GlobalThemeOverrides`).

## Questions settled in this session

- #6 pro-naive-ui merge is CORRECT (pass-through verified); reviewer retracted "misapplied/does nothing".
- #7 fallback home = style.css (not inline defaults); csstype cast required.
- New finding: render `i18n` prop read needs a boundary cast (`unknown` → typed prop).

## Suggested next questions

- Should `.ui-card` default vars live in the `components` Tailwind layer or outside layers in `style.css`? (Tailwind v4 layer ordering vs injected third-party cssr styles — see repo skill on layered Tailwind utilities.)
- After Step 4 lands `NoobUiThemeOverrides` in ui, confirm the admin `AdminPresetThemeOverrides` import direction (admin already depends on `@noob-naive-ui/ui` workspace:*).
- Cross-model second opinion (Gemini/Codex) on the full plan before `task.py start` — optional per doubt-driven protocol.
