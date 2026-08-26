# vael-ui audit (2026-08-26)

Source: github Mini-Sylar/vael-ui, docs vael-ui.dev, npm workspace.

## Architecture (from README)

> Vapor first components for Vue 3

* One component per primitive, plain CSS by default, animation-agnostic.
* **Dual build from same package**: every component written once as VDOM SFC,
  compiled a second time through Vapor's compiler into separate entry:
  ```ts
  import { Button } from 'vael-ui'         // classic VDOM
  import { Button } from 'vael-ui/vapor'   // Vapor build, same props/API
  ```
* Verified via `__vapor` flag in `packages/vapor-ui/tests`.
* Build scripts: `pnpm build` runs both `vael-ui` + `vapor-ui` + chunk-splitting verifier.

## Packages in repo

* `packages/scripts`, `packages/ui`, `packages/vapor-ui`,
  `packages/vapor`, `packages/vapor-interop`, `packages/docs`.

## Component count

`packages/ui/src/components` dir list not fully fetched (API timeout),
but README implies "one component per primitive" — small surface (estimated <30
components based on typical vapor-first libs). Contrast naive-ui >80 components.

## Theme & i18n (from package.json + src/theme.ts)

* `ConfigProvider :theme="{ primary, radius }"`  — only ~2 theme tokens in the
  example (vs naive's `common` + per-component vars + Typography/Flex etc.).
* Dark mode is CSS-only: `<html data-theme="dark">` + `prefers-color-scheme`.
  No per-component theme overrides tree like naive's `GlobalThemeOverrides`.
* `useColorScheme()` for mode persistence — minimal.
* No `themeOverrides` deep tree observed; not an `NConfigProvider`-style fan-out.

## Assessment for this framework

| Aspect | naive-ui (status quo) | vael-ui |
|---|---|---|
| Theme token richness | Large (common + per-component, size-keyed) | Thin (primary+radius demo) — as you noted |
| i18n | Full (`NLocale`-like, per-locale messages) | Not audited — likely minimal |
| Vapor-native | No (only builds with vapor compiler) | **Yes, first-class** |
| Interop cost | N/A (pure vdom, fast 40ms @30 tabs) | N/A (vapor subtree, cheap) |
| Maturity | 2.4x, huge community | 0.x, single maintainer, July 2026 |

Conclusion: vael-ui solves the interop problem by construction, but requires
rebuilding the design system around a thin token set and filling i18n/a11y gaps.
Viable only if you accept a minimal DS or are willing to grow it.

## Sources

* https://github.com/Mini-Sylar/vael-ui
* https://vael-ui.dev
* npm workspace package.json (pnpm tasks: build, typecheck, test:vapor etc.)
