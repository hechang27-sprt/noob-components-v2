# Documentation reconciliation design

## Documentation ownership model

Each retained current claim has one owner:

| Knowledge type | Canonical owner | Excluded content |
|---|---|---|
| Project-specific domain language | Root `CONTEXT.md` | Implementation details, package APIs, task status |
| Implemented or currently binding, hard-to-reverse decisions with real alternatives | `docs/adr/` | Future plans, routine choices, obvious package facts |
| Durable current coding conventions and package contracts | Existing `.trellis/spec/<package>/<layer>/` files | Product roadmap, history, intended future behavior |
| Work currently being implemented | Owning `.trellis/tasks/<task>/` artifacts | Generic future-feature backlog |
| Unimplemented ideas, stale/redundant/history/scratch content | Deleted | Archive-by-default behavior |

No repository-wide architecture roadmap is created. The codebase and current package specs describe established architecture; future behavior is documented only when its implementation begins.

`docs/agent/` is removed after surviving current knowledge has moved to an owner. Existing `docs/agents/` is a separate, user-owned setup directory and is not part of this migration.

## Canonical vocabulary

Create one root `CONTEXT.md` only if the final evidence review confirms these are project-specific domain terms rather than implementation labels:

- **Admin shell** — router-neutral application chrome and page-instance navigation surface supplied by the admin package. Avoid unqualified “admin runtime.”
- **Admin router runtime** — Vue Router lifecycle integration that synchronizes routes, browser history, and Admin-shell page instances. Avoid “router adapter” where lifecycle ownership is intended.
- **Host application** — consumer that supplies authentication operations, backend integration, menu policy, and application pages. Avoid “starter” as a generic consumer term.
- **Destination** — router-neutral request to open or activate an Admin-shell page instance.
- **Page instance** — one identity-bearing open occurrence represented by an Admin-shell tab; multiple instances may share a destination.

Definitions must agree with current public contracts and remain implementation-independent. Any term that cannot meet that bar stays in package specs rather than `CONTEXT.md`.

## Legacy-file disposition

| Legacy file | Retain only if currently truthful | Canonical destination | Legacy disposition |
|---|---|---|---|
| `admin-runtime-contract.md` | Implemented package/host ownership boundary and backend-free shell contract | Existing admin specs; qualifying current ownership ADR | Delete; concrete draft contains superseded auth/login/router details |
| `admin-shell-page-instance-navigation.md` | Implemented page-instance model and router-neutral boundary | Glossary where domain-level; existing admin runtime spec; qualifying current ADR | Delete; implementation notes duplicate specs/tasks |
| `boundary-map.md` | Current cross-package ownership rules that maintainers must apply | Relevant package specs or qualifying ownership ADR | Delete; no standalone architecture map is retained |
| `architecture-audit.md` | Only currently actionable coding rules not already canonical | Relevant package specs | Delete; point-in-time audit, historical findings, and future ideas are noncanonical |
| `rewrite-plan.md` | Current executable rules already reflected in code | Relevant package specs when missing | Delete; unfinished future targets and phase plans are intentionally discarded |
| `admin-rewrite-brainstorm.md` | Implemented, durable ownership decisions | Relevant package specs or qualifying current ADR | Delete; alternatives, future intent, and brainstorm residue are noncanonical |
| `components-rewrite-brainstorm.md` | Implemented Naive UI/package-boundary rules | Existing UI specs; qualifying current UI-foundation ADR | Delete; proposed future components and migration targets are intentionally discarded |
| `plan.md` | Current rules not already represented elsewhere | Relevant specs only | Delete; obsolete execution plan and approval gates conflict with completed work |
| `todo.md` | Nothing; active/archived Trellis tasks own status | None | Delete |
| `README.md` | Nothing after directory removal | Update inbound links to canonical current docs | Delete with directory |

The implementation records a final claim-level migration report in the task directory before deleting sources. This is a review ledger for the reconciliation, not permanent product documentation.

## ADR policy

Create an ADR only when extracted evidence describes an implemented or currently binding decision and meets all three thresholds: costly to reverse, surprising without context, and selected through a real trade-off.

Likely candidate:

- **Router-neutral Admin shell with host-owned backend policy and a separate admin router runtime** — retain only if current code confirms the boundary and existing specs do not already preserve enough rationale.

The earlier curated-rewrite/Naive-UI direction is not automatically preserved: future capability choices are discarded, while current Naive UI package-boundary rules belong in `.trellis/spec/`. Create an ADR only if the implemented foundation itself needs lasting trade-off rationale.

## Compatibility and safety

- No runtime or package API changes.
- Update every `.trellis/spec/` link that points into `docs/agent/`; broken cross-references are a release blocker.
- Preserve unrelated uncommitted `AGENTS.md` and `docs/agents/*` changes byte-for-byte.
- Validate retained current-state claims against code/tests; do not retain a claim merely because an old plan marked it desired.
- Deletion is the rollback boundary: create and verify canonical replacements and the migration report before removing legacy files.
