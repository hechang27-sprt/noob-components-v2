# Design: make the font-size preference resize the top bar and main content

## Root-cause model

| Surface | Why it doesn't respond today | Fix |
|---|---|---|
| Header nav buttons | `admin-shell.tsx` hardcodes `size="large"`; NButton resolves `props.size ?? componentOptions.Button.size ?? 'medium'` | Remove the hardcoded `size` → tier reaches them via `componentOptions` |
| Tab strip | `NTabs` hardcodes `size="small"` | Remove it → `Tabs` is in `GlobalComponentConfig` |
| Plain-HTML main content | naive-ui sets `body { font-size: 14px }` statically (not preference-driven); demo pages use Tailwind `rem` utilities | Host sets the root `html` font-size from the preference; `rem` scales automatically |

`ProLayout` is not a factor: it renders plain HTML inside an `NScrollbar` and does not
reset naive-ui's injected config, so `componentOptions` already propagates through it
(verified: Reports page `NButton` resizes 28px→40px).

## Data flow

```
preferences.fontSize ("small"|"medium"|"large")
  ├─ naiveUiConfig.themeOverrides  = FONT_SIZE_OVERRIDES[fontSize]   (naive component font)
  ├─ naiveUiConfig.componentOptions= COMPONENT_SIZE_OPTIONS[fontSize] (naive component sizes)
  │     └─ AdminShell chrome: remove hardcoded size → follows tier   (top bar)
  └─ resolveAdminNaiveBaseFontSize(fontSize) = "13px"|"14px"|"16px"   (host, new)
        └─ App.tsx sets document.documentElement.style.fontSize → rem content scales
```

## Changes

### 1. Admin package — `src/components/admin-shell.tsx`
Remove the hardcoded `size="large"` prop from the five header nav `NButton`s
(sidebar, theme-mode, font-size, locale, account) and `size="small"` from the tabbar
`NTabs`. No other chrome change. The controls then resolve their size from the host's
`componentOptions` tier (default `medium`).

### 2. Admin package — `src/runtime/naive-ui-config.ts`
Add `resolveAdminNaiveBaseFontSize(fontSize: AdminFontSize): string` returning
`"13px" | "14px" | "16px"`, derived from the same tier as `FONT_SIZE_OVERRIDES`
(single source of the 13/14/16 mapping). Export it from `src/index.ts`.

Rationale for a standalone helper (not a config field): `naiveUiConfig` is spread onto
`NConfigProvider`, so adding a bare `fontSize` field would reintroduce the
invalid-prop bug. The host calls the helper explicitly.

### 3. Demo host — `apps/demo/src/App.tsx`
In `setup`, watch the font-size preference and set
`document.documentElement.style.fontSize` to `resolveAdminNaiveBaseFontSize(...)`.
Because the demo content uses Tailwind `rem` utilities, scaling the root `html` font
scales text (and, proportionally, `rem`-based spacing/layout — the coherent meaning of
a font-size preference). naive-ui component text is unaffected by the root font (it
uses `themeOverrides`), so there is no double-application.

### 4. Tests
- Add `resolveAdminNaiveBaseFontSize` mapping assertions to
  `packages/admin/tests/shell-preferences.test.ts` (or a runtime helper test).
- No admin-shell chrome-size DOM test needed: happy-dom does not compute real sizes,
  and no existing test asserts the `size` props. The chrome behaviour is verified in
  the browser.

### 5. Spec docs
Update `.trellis/spec/admin/frontend/shell-preferences.md` to document that the shell
chrome follows `componentOptions` (no hardcoded sizes) and that hosts apply
`resolveAdminNaiveBaseFontSize` for plain-HTML base font scaling.

## Tradeoffs

- Scaling the root `html` font also scales `rem`-based spacing/widths in the demo
  content. This is the coherent behaviour for a base-font-size preference and requires
  no page-content changes; the alternative (em-only text scaling) would touch every
  demo page and leave spacing fixed.
- The header buttons drop from `large` to the tier default (`medium` at defaults), a
  modest visual change, accepted because the user wants the top bar to respond.

## Rollback

All changes are source-only and reverts restore prior presentation; no persisted
state or public contract (other than a new exported helper) is affected.
