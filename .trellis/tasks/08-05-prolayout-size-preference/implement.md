# Implementation plan: font-size preference resizes top bar + main content

## Ordered checklist

1. `packages/admin/src/components/admin-shell.tsx` — remove `size="large"` from the
   five header nav `NButton`s and `size="small"` from the tabbar `NTabs`.
2. `packages/admin/src/runtime/naive-ui-config.ts` — add
   `resolveAdminNaiveBaseFontSize(fontSize: AdminFontSize): string` (13/14/16px).
3. `packages/admin/src/index.ts` — export `resolveAdminNaiveBaseFontSize`.
4. `apps/demo/src/App.tsx` — watch the font-size preference and set
   `document.documentElement.style.fontSize` from the helper.
5. Tests — add `resolveAdminNaiveBaseFontSize` mapping assertions.
6. Spec docs — update `.trellis/spec/admin/frontend/shell-preferences.md`.

## Validation commands

```sh
pnpm --filter @noob-naive-ui/admin typecheck
pnpm --filter @noob-naive-ui/admin test
cd apps/demo && pnpm typecheck
```

## Browser verification

With the demo dev server running at `http://localhost:5173`:
- Select Small / Large in the font-size dropdown; confirm the header nav buttons and
  tab strip resize, and the dashboard main-content text scales.
- Compare against the baseline (medium): button height 40px→tier height, content text
  16px→13/16px.

## Review gates

- Confirm no hardcoded `size` remains on the shell chrome (top bar).
- Confirm `naiveUiConfig` spread still type-checks (no new bare field on the config).
- Confirm the 13/14/16 mapping exists in exactly one place.
