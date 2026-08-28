# Vuetify0 Vapor integration (2026-08, commit 1d48a15b)

Source: `0.vuetifyjs.com/guide/integration/vapor` (Vuetify0 v1.0 docs).

## Positioning

* Vapor ships in Vue 3.6 RC (feature-complete). Docs are a forward-compat target.
* Verification: isolated `tests/vapor` suite on pinned `3.6.0-rc.2` with
  `vaporInteropPlugin`; asserts composables, instance shim, component interop.

## Core design rule

> Composables are logic, not markup. (...) They have no dependency on the
virtual DOM, so they run unchanged inside a Vapor component's setup.

Components keep templates conventional — ordinary SFCs, no `h()` tricks.

## Verified interop

* Classic vdom component inside Vapor parent via `vaporInteropPlugin` works,
  including slot content forwarded from vapor.
* Instance shim: `getCurrentInstance()` is null in Vapor, yet v0 resolves via
  `currentInstance` export fallback.

## The interop boundary rule (the one we hit)

> Every classic component instantiated directly from a Vapor-compiled template
> is its own interop crossing, and the plugin's overhead scales with the
> number of crossings — not with what the components do.

> Put the Vapor<->vdom boundary **ABOVE** the repeated region, never inside it.

* 200 compound checkboxes (Root + Indicator each): **+44% mount, +12% heap**
  inline vs classic root; same tree behind ONE classic wrapper = within noise.
* Production SPA 11k tests: **+66-78% mount, +49% heap** inline, collapsing
  to noise with wrapper.
* "Nothing warns you when the boundary sits inside the loop."

> [!WARNING]
> The wrapper is a parity workaround, not a win: everything inside still
> renders classic, so it never sees Vapor's cheaper updates.

## Source

* https://0.vuetifyjs.com/guide/integration/vapor (commit 1d48a15b)
* Vue 3.6.0-rc.1 release notes: "having distinct regions in an app where one
  rendering mode or the other is used, and avoiding mixed nesting as much as
  possible" is a PERFORMANCE boundary.
