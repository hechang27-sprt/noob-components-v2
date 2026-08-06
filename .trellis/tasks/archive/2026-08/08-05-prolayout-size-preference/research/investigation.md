# Investigation: font-size preference does not resize top bar / main content

## Summary

The hypothesis that `pro-naive-ui`'s `ProLayout` blocks naive-ui `componentOptions`
and needs separate config is **incorrect**. `componentOptions` propagates through
`ProLayout` unchanged. The observed symptom has two independent root causes:
hardcoded `size` props on the admin shell chrome, and naive-ui's static global
`body` font-size.

All findings below were verified against `naive-ui@2.44.1` / `pro-naive-ui@3.2.3`
sources and empirically in the demo at `http://localhost:5173`.

## Finding 1 — ProLayout does not block componentOptions

`ProLayout`'s render is plain HTML (`aside`/`header`/`main`/`footer`) wrapped in an
`NScrollbar` (`node_modules/pro-naive-ui/es/layout/layout.js`). It creates no nested
config provider and does not reset naive-ui's injected config context, so every
descendant naive-ui component still resolves `componentOptions` through the host
`NConfigProvider`.

Empirical: the demo Reports page `NButton` (no explicit `size`) rendered
`n-button--small-type` (28px) at the `small` preference and `n-button--large-type`
(40px) at `large`. `componentOptions` works through ProLayout.

`pro-naive-ui` does have its own global config (`ProConfigProvider` with
`propOverrides`), but that overrides *pro* component props (e.g. `ProLayout`
`navHeight`); it is not required and does not affect naive-ui component sizes.

## Finding 2 — Why the menu "works" but cannot be resized

NMenu text follows `themeOverrides.common.fontSize` (13/14/16px), which is why the
menu visibly changes. But `Menu` is **not** a key in naive-ui's `GlobalComponentConfig`
type, and NMenu does not call `useConfig`/`mergedComponentProps`. So `componentOptions`
cannot resize the menu — its item height stays 42px at every tier (only its text font
changes). The menu "working" is the theme font, not the size tier.

## Finding 3 — Why the top bar does not respond

`admin-shell.tsx` hardcodes `size="large"` on every header nav `NButton` (sidebar,
theme, font-size, locale, account) and `size="small"` on the tabbar `NTabs`.
NButton resolves `mergedSize = props.size ?? componentOptions.Button.size ?? 'medium'`
(`Button.mjs:116`), so an explicit `size` prop wins over `componentOptions`. Both
`Button` and `Tabs` ARE in `GlobalComponentConfig` and merge via `useConfig`, so
removing the hardcoded sizes lets the preference reach the shell chrome.

## Finding 4 — Why the main content does not respond

- The demo content pages are plain HTML with Tailwind `rem`-based utilities
  (`text-2xl` = 1.5rem, `text-base` = 1rem, `p-6`, `leading-6`). `rem` is relative to
  the root `html` font-size.
- naive-ui's global style sets `body { font-size: 14px }` **statically** from the
  default `common.fontSize` (`node_modules/naive-ui/es/_styles/global/index.cssr.mjs`);
  the source comment states it "won't be changed in the app's lifetime" and that
  overriding requires the app to do it itself.
- Therefore `themeOverrides.common.fontSize` (13/14/16px) reaches only naive-ui
  component text, never plain HTML / the body.

## Fix

1. **Top bar (admin package)** — remove the hardcoded `size="large"` (header nav
   buttons) and `size="small"` (tabbar `NTabs`) so the shell chrome follows the
   host's `componentOptions` size tier.
2. **Main content base font (demo host)** — the admin package exports a
   `resolveAdminNaiveBaseFontSize(fontSize)` helper (13/14/16px, DRY with
   `FONT_SIZE_OVERRIDES`); the demo `App.tsx` applies it to `document.documentElement`
   so `rem`-based content scales with the preference. naive-ui cannot do this itself.

## Non-goals

- No change to the naive-ui size mechanism (`componentOptions`), which is correct.
- No separate `pro-naive-ui` config; none is needed.
- The menu's inability to resize via `componentOptions` (unsupported by naive-ui) is
  out of scope; its text already follows the preference.
