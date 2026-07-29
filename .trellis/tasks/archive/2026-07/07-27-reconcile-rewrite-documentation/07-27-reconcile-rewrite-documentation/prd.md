# Reconcile rewrite documentation

## Goal

Establish one truthful, maintainable documentation system for the ongoing rewrite by reconciling `docs/agent/` with the current implementation, `.trellis/spec/`, and the documentation layout configured by the Matt Pocock skills.

The result must preserve durable current knowledge without retaining stale plans, future-feature documentation, or a parallel architecture source of truth.

## Background

- `docs/agent/` contains rewrite brainstorms, architecture audits, boundary documents, plans, and runtime/navigation contracts accumulated during the rewrite.
- `.trellis/spec/` contains package- and layer-scoped coding guidelines rather than product requirements or historical planning notes.
- The coarse-grained codebase architecture is already settled.
- The user keeps unimplemented future architecture in mind and will document future features when implementation begins; a repository-wide roadmap is unnecessary.
- Existing uncommitted changes under `docs/agents/` and `AGENTS.md` belong to the user and must not be overwritten or conflated with the legacy `docs/agent/` corpus.

## Requirements

- Inventory every file under `docs/agent/`; no file may remain unclassified.
- Validate material current-state claims against current code, tests, current Trellis task artifacts, and canonical specs before deciding their disposition.
- Migrate persistent, truthful knowledge to the documentation type that owns it:
  - domain terms to the configured domain glossary/context structure;
  - implemented or currently binding hard-to-reverse, surprising trade-off decisions to ADRs;
  - durable current package contracts and coding conventions to `.trellis/spec/`;
  - active implementation requirements to their owning task artifacts.
- Remove unimplemented future architecture and feature ideas unless an active task currently owns their implementation.
- Remove legacy documents or sections that are redundant, false, superseded, stale, historical, or purely transient agent scratch work.
- Preserve provenance only where needed to understand a retained current decision.
- Run domain-model grilling against ambiguous or overloaded terminology in retained current documentation.
- Avoid copying implementation details into the domain glossary and avoid treating `.trellis/spec/` as a product roadmap or history store.
- Standardize ownership vocabulary as **Admin shell** (router-neutral UI/controller package), **admin router runtime** (Vue Router lifecycle integration), and **host application** (consumer supplying auth, backend integration, menus, and application policy).
- Do not modify unrelated user-owned uncommitted files.

## Out of Scope

- Creating or maintaining a repository-wide architecture roadmap.
- Documenting unimplemented future features or architecture.
- Implementing rewrite features or changing runtime behavior.
- Redesigning architecture that is already settled and accurately implemented.
- Preserving historical reasoning merely because it was once truthful.

## Acceptance Criteria

- [ ] Every file formerly under `docs/agent/` has a recorded disposition and rationale.
- [ ] Every retained claim has a single canonical owner and agrees with current repository evidence.
- [ ] No repository-wide roadmap or intended-state feature documentation is created.
- [ ] Unimplemented future architecture and feature ideas are removed unless an active task currently owns their implementation.
- [ ] Redundant, false, superseded, stale, historical, and scratch-only content is removed rather than archived.
- [ ] Domain terminology retained from the corpus is concise, implementation-independent, and non-duplicative.
- [ ] The glossary and current package documentation use “Admin shell,” “admin router runtime,” and “host application” consistently and avoid unqualified “runtime” where ownership is ambiguous.
- [ ] ADRs are created only for implemented or currently binding decisions meeting the hard-to-reverse, surprising, real-trade-off threshold.
- [ ] `.trellis/spec/` receives only durable, executable guidance that is truthful of the current codebase.
- [ ] Existing unrelated uncommitted changes remain intact.
- [ ] Documentation links and repository documentation checks pass after migration and deletion.
- [ ] A final reconciliation report maps each legacy document to its destination(s) or deletion rationale.

## Confirmed Decisions

- Do not maintain a repository-wide architecture roadmap or documentation for unimplemented future features.
- Add future-feature documentation only when implementation work begins, using the owning task and then promoting durable knowledge after it becomes current.
- Canonical ownership terms are “Admin shell,” “admin router runtime,” and “host application.”
