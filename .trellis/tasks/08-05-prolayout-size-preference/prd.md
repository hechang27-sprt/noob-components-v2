# PRD: Font-size preference resizes top bar and main content

## Problem

Changing the font-size preference (Small / Medium / Large) resizes the sidebar menu
text and naive-ui components, but the shell **top bar** (header nav controls + tab
strip) and the demo **main content area** (plain HTML pages) do not visibly respond.
A prior change mapped the preference to `NConfigProvider`'s `componentOptions`
(naive-ui has no global size prop), which fixed naive-ui components but left the
shell chrome and plain content untouched.

## Goals

1. The shell top bar (header nav buttons, tab strip) follows the font-size preference.
2. The demo's plain-HTML main content scales its base font with the preference.
3. Keep the naive-ui size mapping centralized in the admin package; no `pro-naive-ui`
   config is required.

## Non-goals

- No change to naive-ui's `componentOptions` mechanism (it is correct).
- No separate `pro-naive-ui` / `ProConfigProvider` configuration.
- No change to the sidebar menu's size (naive-ui does not support per-component
  resizing of `Menu`; its text already follows the preference via theme font).
- No change to the login-page loading spinner or any page content copy.

## Constraints

- `naiveUiConfig` is spread onto `NConfigProvider`, so it must not gain a bare
  `fontSize` field (that would reintroduce the invalid-prop bug). The base font-size
  must be exposed as a standalone helper, not a field on the spread config.
- The 13/14/16px mapping must live in one place (the admin package), not be
  duplicated in the demo.
- Existing admin-shell tests must keep passing (none assert the chrome `size` props).

## Acceptance criteria

- [ ] Selecting Small / Large in the font-size dropdown resizes the header nav buttons
      and the tab strip (no fixed `size` prop overrides `componentOptions`).
- [ ] The demo main-content text scales with the preference (root font-size applied
      from the preference; `rem`-based Tailwind text scales).
- [ ] `resolveAdminNaiveBaseFontSize` is exported from `@noob-naive-ui/admin` and maps
      small/medium/large to 13px/14px/16px.
- [ ] No `pro-naive-ui` config added.
- [ ] `pnpm --filter @noob-naive-ui/admin typecheck`, admin `test`, and demo
      `typecheck` all pass.
