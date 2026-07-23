# Design: distributed PR review

## Review boundary

The review target is the committed range `main...HEAD`. Existing uncommitted changes (`TODO.md` deletion and `apps/demo/src/routes.tsx` modification) are user work and must not be conflated with the committed PR diff.

## Distribution

Partition all included files into 16 locality-based groups with two explicit review domains:

- **Workspace source**: packages and applications declared by `pnpm-workspace.yaml`, including their source, tests, package manifests, and build configuration. Implementation and directly related tests stay together, and findings are judged against runtime/public-package behavior.
- **Auxiliary material**: `.trellis/`, `docs/`, root tooling/configuration, editor settings, and task/workspace records. These are reviewed for workflow, documentation, and configuration consistency, not treated as shipped package source.

Demo integration, admin core, router adapter, workspace configuration, and auxiliary records each receive explicit ownership. Every file has one owner; reviewers must not expand scope.

## Evidence flow

1. Reviewers inspect assigned diffs using `git diff main...HEAD -- <paths>` or equivalent `git show`.
2. Reviewers read full assigned files only where diff context is insufficient.
3. Reviewers return incremental yield sections containing findings and a verdict.
4. The main reviewer deduplicates findings, checks cross-module implications, and ranks actionable items by severity.
5. Repository-level commands provide validation evidence without modifying source files.
6. Consolidated results are recorded in `review.md`; the task returns to planning so remediation scope can be decided before implementation.

## Finding contract

Each finding includes severity, exact file/line anchor, observed behavior, impact or reproduction scenario, and concrete remedy. Architecture/style observations are findings only when they create a demonstrable maintenance or correctness risk.

## Safety and compatibility

No source changes are made. Reviewer commands are read-only except normal test/build artifacts. Uncommitted user changes are preserved. If a validation command includes those changes, that limitation is stated.
