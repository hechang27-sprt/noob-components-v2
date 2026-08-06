# Merge fix-tabbar-css workspace into main; resolve tabbar conflict

## Goal

Merge the `fix-tabbar-css` worktree's committed work (ProLayout chrome configuration + tabbar CSS) into the main workspace and validate the combined tree. The merge of `lxsxvkzr` (main lineage: locale-HMR preset, AdminShell tab-state store, defineComponent slot components) with `mmytyzwk` (fix-tabbar-css lineage: pro-layout-config, shell-preferences computed, admin-shell activeKey watchers, tabbar CSS) produced one 2-sided conflict in `packages/admin/src/components/admin-shell-tabbar.tsx`.

## Requirements

- R1: resolve `admin-shell-tabbar.tsx` faithfully — keep the `defineComponent` structure (main lineage) and carry the tabbar CSS changes from fix-tabbar-css (`w-full h-full` container, `class="h-full justify-end"` on NTabs).
- R2: no other merged content may be dropped or altered (pro-layout-config.ts, shell-preferences, index.ts exports, admin-shell.tsx watchers + `proLayoutConfig` spread + `tabbarClass`).

## Acceptance criteria

- AC1 (verified): `jj status` shows no unresolved conflicts; merge commit retains both parents.
- AC2 (verified): admin typecheck, admin tests (74/74), demo typecheck + build, root tsc, oxfmt, oxlint all pass.
- AC3 (verified in browser): merged shell renders 3 tabs; tabbar carries `w-full h-full` + transparent bottom border; HMR regression holds (tabbar class edit and AdminShell.json edit both preserve tabs with no reload).
- AC4: fix-tabbar-css agent notified that its committed work is merged and it should sync/rebase before resuming.

## Out of scope

- The fix-tabbar-css agent's in-flight follow-up task ("Watch activeKey for navigation") — separate workspace, not part of this merge.
