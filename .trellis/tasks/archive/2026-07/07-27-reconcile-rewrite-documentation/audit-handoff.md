# docs/agent/ Audit — Consolidated Handoff

**Auditor:** legacy-doc-audit (subagent)
**Date:** 2026-07-27
**Peers:** implementation-truth-audit, spec-boundary-audit (both complete)

## Summary

10 files audited. ~60% of content is duplicate across files. ~70% references the OLD `../noob-components` repo (not `noob-components-v2`). Three files are current (modified 2-5 days ago); seven files are 17-20 days stale.

| Disposition | Count | Files |
|---|---|---|
| → Historical archive | 5 | architecture-audit.md, admin-rewrite-brainstorm.md, components-rewrite-brainstorm.md, boundary-map.md, rewrite-plan.md |
| → Create ADRs from | 4 | admin-runtime-contract.md, admin-shell-page-instance-navigation.md (plus boundary-map, rewrite-plan) |
| → Delete (transient) | 3 | README.md, todo.md, plan.md |
| → Absorb into spec, then delete | 2 | admin-runtime-contract.md, admin-shell-page-instance-navigation.md |

## Immediate Actions (ordered)

### 1. Create ADRs (4 files)

```
docs/adr/0001-admin-frontend-only-runtime.md     ← admin-runtime-contract.md
docs/adr/0002-naive-ui-direct-peer.md            ← boundary-map.md + components-rewrite-brainstorm.md
docs/adr/0003-starter-owned-menu-tree.md         ← admin-runtime-contract.md + plan.md
docs/adr/0004-page-instance-tab-navigation.md    ← admin-shell-page-instance-navigation.md
```

### 2. Move to historical archive

```sh
mkdir -p docs/archive/rewrite-research
mv docs/agent/architecture-audit.md docs/archive/rewrite-research/
mv docs/agent/admin-rewrite-brainstorm.md docs/archive/rewrite-research/
mv docs/agent/components-rewrite-brainstorm.md docs/archive/rewrite-research/
mv docs/agent/boundary-map.md docs/archive/rewrite-research/
mv docs/agent/rewrite-plan.md docs/archive/rewrite-research/
```
Add `HISTORICAL — Audit of the OLD noob-components repo` banner to each.

### 3. Delete transient files

```sh
rm docs/agent/README.md
rm docs/agent/todo.md
rm docs/agent/plan.md
```

### 4. Absorb into spec, then delete

- Confirm `.trellis/spec/admin/frontend/runtime-contract.md` covers all live claims from admin-runtime-contract.md and admin-shell-page-instance-navigation.md.
- Delete both source files.

### 5. Update 11 cross-references in `.trellis/spec/`

| Spec file | Line | Old ref | New ref |
|---|---|---|---|
| spec/admin/frontend/index.md | 12 | docs/agent/admin-runtime-contract.md | docs/adr/0001-... |
| spec/admin/frontend/runtime-contract.md | 39 | docs/agent/admin-runtime-contract.md | docs/adr/0001-... |
| spec/admin-starter/frontend/index.md | 10 | docs/agent/admin-runtime-contract.md | docs/adr/0001-... |
| spec/admin-starter/frontend/current-state-and-ownership.md | 12 | docs/agent/admin-runtime-contract.md and tasks/plan.md | docs/adr/0001-... and docs/adr/0003-... |
| spec/ui/frontend/index.md | 10 | docs/agent/boundary-map.md | docs/archive/rewrite-research/boundary-map.md |
| spec/ui/frontend/index.md | 11 | docs/agent/components-rewrite-brainstorm.md | docs/archive/rewrite-research/components-rewrite-brainstorm.md |
| spec/ui/frontend/library-conventions.md | 11 | docs/agent/boundary-map.md and docs/agent/rewrite-plan.md | docs/adr/0002-... |
| spec/ui/frontend/library-conventions.md | 23 | docs/agent/components-rewrite-brainstorm.md | docs/archive/rewrite-research/components-rewrite-brainstorm.md |
| spec/guides/index.md | 23 | tasks/plan.md and docs/agent/admin-runtime-contract.md | docs/adr/0001-... |
| spec/guides/cross-layer-thinking-guide.md | 14 | docs/agent/admin-runtime-contract.md and tasks/plan.md | docs/adr/0001-... |
| spec/guides/code-reuse-thinking-guide.md | 7 | docs/agent/rewrite-plan.md | docs/adr/0002-... |

### 6. Verify

```sh
find docs/agent/ -type f          # should be empty
ls docs/adr/                       # should have 0001-0004
ls docs/archive/rewrite-research/  # should have 5 files
grep -r 'docs/agent/' .trellis/spec/  # should be empty
pnpm typecheck && pnpm build       # should pass
```

## Critical Bug to Fix During Migration

`docs/agent/admin-runtime-contract.md:133-136` defines `AdminAuthActions.login` as `Promise<void>`. The implemented code uses `AdminAuthStoreConfig.login` returning `Promise<AdminAuthIdentity>`. The `.trellis/spec/admin/frontend/runtime-contract.md:7-9` already has the correct contract. When absorbing into spec, use the code/spec version, not the stale doc version.

## Domain Terminology to Standardize

| Ambiguous term | Prefer |
|---|---|
| "runtime" (package vs execution) | "admin package" / "@noob-naive-ui/admin" for package; "at render time" for execution |
| "shell" (component vs package vs layout) | "AdminShell" for component; "admin package" for package; "layout frame" for visual |
| "navigation" (visibility vs tabs) | Retire "route visibility" sense; use "tab navigation" for current concept |
| "starter" (package vs role) | "admin-starter" for package; "host app" for architectural role |

## Files NOT to Touch

- `docs/agents/*` — user-owned uncommitted changes
- `AGENTS.md` — user-owned uncommitted changes
- Any code under `packages/` or `apps/`
