# Online research — vapor<->vdom interop cost & workarounds (2026-08-26)

## 1. Official guidance: mixed nesting is a PERFORMANCE boundary

- Vue 3.6 release notes (rc.1): *"having distinct regions in an app where one
  rendering mode or the other is used, and avoiding mixed nesting as much as
  possible"* (https://github.com/vuejs/core/releases/tag/v3.6.0-rc.1).
- Full interop contract in 3.6.0-beta.1 notes
  (https://github.com/vuejs/core/releases/tag/v3.6.0-beta.1): standard props/
  events/slots covered, "rough edges with VDOM-based component libraries" and
  the vapor-slot rule (vdom components must use `renderSlot`, not
  `slots.default()`).

## 2. Interop overhead scales with the NUMBER OF CROSSINGS (measured)

Vuetify0 ("built to keep working under Vapor", pinned vue 3.6.0-rc.2)
documented an **interop boundary rule** + gated bench
(docs: apps/docs/src/pages/guide/integration/vapor.md, commit 1d48a15b):

- "Every classic component instantiated directly from a Vapor-compiled
  template is its own interop crossing, and the plugin's overhead scales with
  the number of crossings — not with what the components do."
- "Put the Vapor<->vdom boundary ABOVE the repeated region, never inside it."
  One classic wrapper turns N crossings into one.
- Measured (200 compound checkboxes): inline composition **+44% mount time,
  +12% retained heap** over a classic root; same tree behind ONE classic
  wrapper = within noise. Production SPA (11k tests, 1x/4x CPU throttle):
  **+66-78% mount, +49% heap** inline, collapsing to noise with one wrapper.
- "Nothing warns you when the boundary sits inside the loop — the subtree
  just mounts slower." "The wrapper is a parity workaround, not a win... keep
  regions in one rendering mode."

=> This is EXACTLY our measured shape: pure-vdom A @30 tabs ~40 ms vs vapor
tree with naive crossings ~500-690 ms (~17x), same switch, same naive
components. Our admin chrome violates the guideline maximally (vapor shell
with naive components interleaved everywhere; 30 per-tab naive buttons).

## 3. naive-ui per-instance cost is independently high (even pure vdom)

- naive-ui issue #6999 (open): n-button render/memory far worse than
  ant/element/tdesign at 10k buttons (2.5-4 s vs 0.5-1 s; ~800 MB-1 GB vs
  200-300 MB) — many reactive refs/computeds per instance (mergedSizeRef,
  mergedFocusableRef, cssVarsRef, themeClassHandle, ...).
- Workaround reported in-thread: `inline-theme-disabled` on NConfigProvider
  (2.5 s -> ~2 s, 800 -> ~650 MB, smaller DOM). Caveat: disables per-instance
  inline theme CSS vars — provider-level overrides still apply, but
  component-site themeOverrides (e.g. our close-button hover white) rely on
  inline vars; MUST A/B visually before adopting.
- naive-ui has NO vapor-native runtime; it only moved its own build toolchain
  to the vue-jsx-vapor compiler (PR 7522 -> 8127, vue-jsx-vapor ^3.2.19).

## 4. Candidate workarounds (ranked, testable with scripts/perf harness)

- W1 (primary, mirrors Vue's own guidance + our experiment A):
  restore the "regions" model — keep the admin chrome (shell, tabbar,
  sidebar/navbar islands) as ONE VDOM region with the boundary ABOVE it, and
  vapor only for the page content. I.e. undo the over-vaporization of the
  shell/tabbar (our perf-vdom-backport experiment = the cheap pattern:
  ~40 ms flushes at 30 tabs).
- W2: naive `inlineThemeDisabled` on NConfigProvider (per-instance cost knob;
  visual A/B required).
- W3: keep reducing naive instances in vapor regions (UiCardTabClose etc.).
- W4 (real fix, upstream): vapor-native naive-ui does not exist; requesting
  vapor support from naive-ui, or filing the interop-cost issue against
  vue-jsx-vapor/runtime-vapor with this evidence, are the durable paths.

## Sources

- https://github.com/vuejs/core/releases/tag/v3.6.0-rc.1
- https://github.com/vuejs/core/releases/tag/v3.6.0-beta.1
- https://github.com/vuetifyjs/0 (guide/integration/vapor, commit 1d48a15b)
- https://github.com/tusen-ai/naive-ui/issues/6999
- https://github.com/tusen-ai/naive-ui/pull/7522, /8127
- https://github.com/vuejs/vue-jsx-vapor (interop docs: vuejsx.dev)
