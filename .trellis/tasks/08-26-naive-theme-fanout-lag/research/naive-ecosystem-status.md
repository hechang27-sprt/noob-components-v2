# Naive-ui ecosystem status wrt Vapor (2026-08-26)

## Build toolchain (already done)

* `vue-jsx-vapor` 3.2.19 in devDeps (naive PR 7522, 8127).
* Naive now builds with the vapor compiler — but runtime remains classic
  (VDOM) — no vapor component announced, search finds no "naive-ui vapor"
  support issue.

## Per-instance cost (issue #6999, open)

> 10k `n-button`: naive ~4s / 1GB vs ant/element/tdesign ~1-3s / 300-800MB.

Maintainer analysis: many reactive refs/computeds per instance
(`mergedSizeRef`, `cssVarsRef`, `themeClassHandle` ...). Workaround reported:
`inline-theme-disabled` on `NConfigProvider` (2.5s->2s, 800->650MB). Caveat:
disables per-instance inline theme CSS vars — breaks component-site
`themeOverrides` (e.g. our close-button hover white).

## VDOM interop naive cost (our measurement)

* Pure vdom (perf-vdom-backport, 30 tabs): size 12.5 ms, theme 39 ms.
* Vapor + vdom naive per-tab (current): size 518 ms, theme 688 ms (~17x).
* Vapor + vdom strip in vdom island: size 11 ms, theme 60 ms (~11x reduction
  of the linear term; residual = whole-tree naive fan-out from shell chrome
  + css-render).

## Other DS vapor status

* Search "element plus/antd vue/tdesign vapor support": 0 vapor-native
  announcements. Only vuetify0 + vael-ui are vapor-first today.
* `vue-jsx-vapor` repo issues: no perf/interop overhead issue filed yet.

## Implication

Until naive ships vapor-native, any VDOM library in a vapor tree pays the
crossing tax. Naive will stay VDOM for 3.6.0; the only first-class vapor
options are vael-ui (thin) and vuetify0 (rich but different design language).
