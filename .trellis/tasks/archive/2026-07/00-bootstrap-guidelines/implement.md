# Trellis Spec Bootstrap Implementation Plan

1. Replace generic frontend indexes with navigation and pre-development checklists matching the final guide set.
2. Write the five source-backed package guides described in `design.md`, citing current source/tests and ratified boundary documents only where the code is intentionally not yet present.
3. Replace the two shared thinking guides with project-specific package ownership and storage/runtime boundary checks; remove Trellis-product boilerplate that does not describe this workspace.
4. Remove obsolete frontend template files and non-applicable backend template directories.
5. Verify every internal Markdown link resolves, indexes enumerate only existing guides, no generic template markers remain, and specs identify the actual build/test commands.
6. Mark the bootstrap PRD checklist complete, then commit the documentation-only change.

## Validation

- `pnpm --filter @noob-naive-ui/ui build`
- `pnpm --filter @noob-naive-ui/ui typecheck`
- `pnpm --filter @noob-naive-ui/admin build`
- `pnpm --filter @noob-naive-ui/admin typecheck`
- `pnpm --filter @noob-naive-ui/admin test`
- Generic-template scan and Markdown-link/index consistency check over `.trellis/spec/`.

No product source, dependency metadata, or package runtime behavior is in scope.
