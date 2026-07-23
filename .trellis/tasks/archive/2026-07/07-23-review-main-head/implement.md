# Execution plan

1. Enumerate the committed `main...HEAD` changed-file set and reconcile it against the 83-file request, excluding `pnpm-lock.yaml` and ignoring unrelated working-tree changes.
2. Define 16 non-overlapping locality-based file groups covering the complete included set. Keep `pnpm-workspace.yaml` package/application source and tests in workspace-source groups; assign `.trellis/`, `docs/`, root/editor tooling, and task records to separate auxiliary-review groups with documentation/configuration criteria.
3. Spawn exactly 16 `reviewer` agents in one parallel batch. Every prompt starts with the active task path and repeats the assigned-file-only, diff-inspection, incremental-yield, and verdict requirements.
4. While agents run, execute repository-level read-only validation suitable for the PR: typecheck, tests, build, lint/format checks as exposed by root scripts. Record failures without editing source.
5. Collect all reviewer outputs, inspect evidence for material findings, and perform focused central checks only where needed to resolve conflicts or cross-module implications.
6. Persist the consolidated severity-ranked review and validation evidence in `review.md`.
7. Keep the task in `planning` while the user decides remediation scope; do not archive the review task merely because the review pass completed.

## Review gates

- Exactly 16 reviewer jobs were launched together.
- Assignment union equals the included changed-file set and intersections are empty.
- Each returned review confirms diff inspection and supplies a verdict.
- Final output does not claim validation beyond commands actually observed.
- Review results are recorded before any remediation work starts.

## Rollback

No implementation edits are planned. If task metadata or planning artifacts must be abandoned, only `.trellis/tasks/07-23-review-main-head/` is review-task-owned; user working-tree changes remain untouched.
