# Interop-hypothesis experiments (two worktrees) — FINAL RESULTS

## Setup

- perf-vdom-backport: jj workspace @ fresh HEAD on `zptxkknv` (last pre-vapor
  commit, babel vue-jsx optimize:false). ONLY change: admin tabbar close
  affordance parity (naive NButton+NIcon, same as current) so naive-instance
  counts match.
- perf-vapor-layout: jj workspace on the current-code base commit. Changes:
  (1) AdminShell -> vapor layout (no ProLayout); (2) createShellRouteComponent
  -> vapor (vdom slot into a vapor shell renders "[object Object]"; .ts renamed
  to .tsx for JSX).
- Harness: scripts/perf/measure-lag.sh + analyze-trace.py — agent-browser
  built-in profiler around a real size/theme switch, 30 tabs VERIFIED before
  profiling (per-session browser isolation, poll-based flow, no-op retry).

## RESULTS (2026-08-26; this box + user's manual testing agree)

| Stack | size->Small flush | theme->Midnight flush | user manual @30+ tabs |
|---|---|---|---|
| perf-vdom-backport (vdom) | 12.5 ms | 39 ms | no issue |
| perf-vapor-layout (vapor, NO ProLayout) | ~16 ms | **688 ms** | STILL lags |
| default (vapor + ProLayout) | ~518 ms | ~490-768 ms | lags |

## VERDICT

Hypothesis C CONFIRMED with a correction:
- **ProLayout is exonerated**: removing it does NOT remove the theme-switch
  lag (B still ~690 ms).
- The amplifier is the **vapor<->vdom interop generally**: the SAME naive
  whole-tree theme fan-out costs ~17x more when naive components are mounted
  through the vapor interop (~40 ms pure-vdom vs ~690 ms vapor). Every naive
  instance in a vapor tree re-materializes props through the interop on each
  flush.
- Hence earlier wins reduced instance churn (TabStrip, UiCardTabClose,
  overrides memo); the remaining constant base = the shell chrome's naive
  components paying interop on every flush.

## Next actions

1. De-naive the shell chrome (sidebar NMenu, navbar island, page chrome) into
   vapor framework components — the main lever to pull the flush toward the
   vdom cost.
2. Upstream: file a vue-jsx-vapor issue with this trace evidence (interop prop
   materialization cost on re-render; ~17x vs pure vdom).
3. Size-decoupling idea stays in reserve (theme switches remain
   naive-inherent).

## Notes

- B's size->Small may itself have been near-noop (15.8 ms < 50 ms retry
  threshold); B's theme number (688 ms) is a confirmed REAL switch.
- Machines: this box traces @30 tabs reproduce the bug (default ~500-770 ms
  size/theme); user confirms vdom fast / vapor-layout slow manually.

## W1 CONSERVATIVE TEST (perf-vapor-layout, 2026-08-26) - CONFIRMED

Converted ONLY the tab strip region to vdom inside perf-vapor-layout
(UiCardTabs + UiCardTab + AdminShellTabbar + AdminTabStrip; vapor AdminShell
and shell-route wrapper unchanged). 30 tabs, same harness:

| variant | size flush | theme flush |
|---|---|---|
| B vapor tab region (before) | ~16 ms | **688 ms** |
| B + vdom tab region (W1) | ~11 ms | **60 ms** |
| A all-vdom reference | 12.5 ms | 39 ms |

=> The tab strip was responsible for ~10/11 of the theme-switch lag; the
residual 60 ms vs A's 39 ms = the other naive crossings in the vapor layout
(sidebar NMenu, navbar islands, page).

Implementation notes (bite the next person who converts):
- VAPOR->vdom slot direction drops children: a vapor parent feeding its
  default slot into a vdom child = empty region. The WHOLE repeated region
  (strip + tabs + naive buttons) must move together.
- VDOM options-form `setup()` must RETURN A RENDER FUNCTION
  (`() => <JSX/>`); returning VNodes directly renders nothing + warns
  "setup() should not return VNodes directly".
