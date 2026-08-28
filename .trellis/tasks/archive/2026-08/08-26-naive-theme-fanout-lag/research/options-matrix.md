# Decision matrix — the four options you listed

Legend: effort T-shirt (S/M/L), risk (code + design + community).

|  | What it is | Perf @30 tabs (measured/inferred) | Tokens / i18n | Effort | Risk | Verdict |
|---|---|---|---|---|---:|---|
| **1** | Revert to vdom root, vapor opt-in per region | Fast: pure vdom baseline ~40ms (A). The everywhere-vapor baseline is ~700ms. Regions model: vdom chrome + vapor pages → ~60ms. | Full naive + host overrides (no change). | S (one commit `jj new zptxkknv` + port current UI fixes back as vdom; already done in perf-vdom-backport) | Low — restores known-good; vapor still usable isolated. | **Safest to ship** |
| **2** | Keep naive design + i18n, build own vapor components | Cheap where you replace: each component you make vapor-native stops paying naive fan-out + interop. Incremental (Button/Tabs first). | Retain familiar tokens (common, per-component) + host i18n keys. | L (reimplement ~30-50 comps vapor-native, a11y/tests). Can be incremental. | Medium — drift from upstream, own maintenance. | **Best long-term if you want naive look without naive cost** |
| **3** | Other DS + own vapor comps | Same perf win as 2 if DS has vapor-native (only vuetify0 today). Antd/element/tdesign are still vdom — same crossing tax as naive. | Vuetify0 has rich tokens but different visual language; others = same thin-token problem as 4. | L + design migration. | Medium-high. | Only if you want Vuetify0's language anyway. |
| **4** | vael-ui as base (the only vapor-native lib) | Native vapor → no interop on its comps (by construction). | Thin — primary+radius demo, CSS-only dark mode (`data-theme`). No deep per-component overrides tree observed; i18n not audited (likely minimal). | S code, L design — you re-add tokens you need. | High — single maintainer, 0.x, small community, July 2026. | Spike only unless thin DS is acceptable. |

## Recommended path (given your "component-dense page would lag" concern)

1. **Immediate: 1** (regions). It's one commit and matches Vue's own
   recommendation — keeps naive at its vdom speed (~40ms) while your ui
   primitives stay vapor-native behind a region boundary. The perf-vapor-layout
   experiment shows the shape: vdom chrome @30 tabs already ~40ms.
2. **Parallel spike: 2 + 4 audit**. Use the harness (30 tabs, scripts/perf)
   to A/B one pilot component (e.g. `UiButton` vapor) vs `NButton`, and finish
   the vael-ui token audit (checklist: common, Typography, Button, Menu, Form,
   DataTable theme vars; i18n `NLocale` coverage; a11y).
3. **Upstream**: file the ~17x interop cost against `vue-jsx-vapor` with our
   before/after traces — the wrapper trick is a parity workaround, not a win.
