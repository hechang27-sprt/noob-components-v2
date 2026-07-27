# Documentation reconciliation implementation plan

## 1. Establish the migration ledger

- Create a claim-level reconciliation report under this task directory.
- For each of the ten `docs/agent/` files, list retained current claims, repository evidence, canonical destination, corrections, and deletion rationale.
- Explicitly classify unimplemented future architecture and feature ideas for deletion unless an active task owns their current implementation.
- Treat every `.trellis/spec/` link into `docs/agent/` as an inbound dependency that must be migrated.

**Gate:** all ten files classified; every retained current claim has exactly one proposed owner; no future roadmap content is retained.

## 2. Create only justified persistent documentation

- Create root `CONTEXT.md` only for project-specific, implementation-independent terms confirmed by current contracts.
- Create only ADRs that describe implemented or currently binding decisions and pass the three-part threshold in `design.md`.
- Do not create a repository architecture roadmap, intended-state overview, future-feature backlog, or historical archive.

**Gate:** glossary contains no implementation details or future behavior; each ADR records a current decision, actual alternatives, and consequences.

## 3. Deepen existing Trellis specs

- Move only durable executable guidance that is truthful of the current codebase into existing `.trellis/spec/` package/layer files.
- Correct stale auth and router terminology while preserving current source-of-truth contracts.
- Replace all `.trellis/spec/` references to `docs/agent/` with local canonical specs, qualifying ADRs, or active task artifacts.
- Do not preserve unimplemented feature targets in `.trellis/spec/` and do not create a second convention beside an existing one.

**Gate:** no `.trellis/spec/` file depends on `docs/agent/`; specs describe current contracts and conventions only.

## 4. Remove the legacy corpus

- Re-read each source immediately before deletion and compare it to the migration ledger.
- Remove all ten files and the now-empty `docs/agent/` directory.
- Update repository links outside `.trellis/spec/` that target the removed directory.
- Do not touch user-owned `docs/agents/` files or unrelated `AGENTS.md` changes.

**Rollback point:** retain source files until Steps 1–3 pass their gates; if verification fails, restore deletions without reverting canonical current documentation.

## 5. Verify from a maintainer’s perspective

- Search the repository for remaining `docs/agent/` references; expected result: none.
- Confirm no roadmap or intended-state future-feature document was introduced.
- Run the repository’s documentation/link checks if present.
- Run Trellis task validation.
- Verify retained claims against current source, tests, and active task artifacts.
- Verify the working changes do not alter runtime source or unrelated user-owned files.
- Conduct Standards and Spec review of the final diff before implementation is considered complete.

## Expected verification commands

Commands must be resolved against repository scripts during execution rather than guessed. Minimum observed checks:

1. repository-wide reference search for `docs/agent/`;
2. repository search confirming no new roadmap/intended-state document;
3. Markdown/link validation exposed by workspace scripts, if present;
4. `python3 ./.trellis/scripts/task.py validate 07-27-reconcile-rewrite-documentation`;
5. package/spec consistency review against current source and active task artifacts.
