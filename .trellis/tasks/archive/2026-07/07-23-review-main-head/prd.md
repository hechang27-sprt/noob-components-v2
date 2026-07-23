# Review `main` to `HEAD`

## Goal

Produce an evidence-based PR-style code review of all non-lockfile changes between `main` and `HEAD`, identifying only actionable defects and risks that affect correctness, maintainability, architecture, security, performance, or verification.

## Requirements

- Review all 83 listed changed files; exclude `pnpm-lock.yaml` as requested.
- Distribute the files by directory and related functionality across exactly 16 parallel `reviewer` agents.
- Each reviewer must focus only on assigned files, inspect their `main...HEAD` diff with `git diff` or `git show`, and may read full assigned-file context.
- Each reviewer must report findings incrementally in yield sections with verdict fields and must not use a separate finding tool.
- Consolidate duplicate or cross-cutting findings centrally.
- Report findings in descending severity with exact file and line anchors, impact, triggering scenario, and a concrete remedy.
- Distinguish workspace package/application source from auxiliary `.trellis/`, `docs/`, root/editor tooling, and task records.
- If no blocking findings remain, explicitly approve the change and state residual verification gaps.

## Acceptance criteria

1. Exactly 16 reviewer agents run in parallel with complete, non-overlapping ownership of all included files.
2. Every included changed file is assigned to one reviewer.
3. Final findings are grounded in inspected diffs or file context; speculative concerns are omitted or labeled `[INFERENCE]`.
4. The final verdict distinguishes blocking findings from non-blocking observations.
5. Review evidence includes repository-level validation appropriate to the changed code where available.
6. Review results are persisted in `review.md` while the task remains in planning for remediation decisions.

## Out of scope

- Editing implementation files.
- Reviewing `pnpm-lock.yaml`.
- Fixing findings unless separately requested.
