# Prefer Naive UI components

## Goal

Replace AdminShell's hand-built preference, sidebar, and tab controls with direct Naive UI composition so the shell presents interactive controls through the project's UI library while preserving its existing frontend-only runtime behavior.

## Confirmed facts

- `packages/admin/src/components/admin-shell.tsx` currently uses three native `<select>` elements for theme, font size, and locale; raw `<button>` elements for sidebar collapse, tab activation, and tab closure; it already composes `NMenu`.
- `packages/admin/package.json` declares `naive-ui` as a peer dependency (`^2.43.1`); the installed version is `2.44.1`.
- Naive UI's local declarations expose `NDropdown` with `options` and `onSelect`, and `NButton` with native button semantics and a `data-*`-compatible root control.
- `packages/admin/tests/admin-shell.test.ts` observes native selects and raw buttons. Dropdown option popups render outside the shell container, so tests must query `document` after opening a trigger.

## Requirements

1. In the authenticated AdminShell branch, use `NDropdown` for theme mode, font size, and locale selection, and use `NButton` for the dropdown triggers, sidebar collapse control, tab activation, and tab close control.
2. Preserve all existing store actions and values: theme mode, font size, locale, and sidebar collapse must retain their current observable behavior.
3. Preserve the tab-controller contract: activation and closure remain async, host-authoritative, duplicate-suppressed, and accessible with the existing `data-admin-tab-*` hooks.
4. Keep the package boundary unchanged: no new public API, runtime contract change, router knowledge, backend knowledge, or dependency.
5. Update observable tests for the Naive controls, including popup-layer dropdown selection through `document`.

## Out of scope

- Converting components outside `packages/admin/src/components/admin-shell.tsx` in this task.
- Changing visual theme tokens, preference persistence, ProLayout behavior, menu composition, or tab state logic.
- Introducing icons, new dependencies, or a component wrapper layer.

## Acceptance criteria

- [x] The authenticated shell directly composes `NDropdown`/`NButton` instead of authored native `<select>` or `<button>` controls for preferences, sidebar collapse, and tabs.
- [x] Selecting theme, font-size, and locale options updates the existing preferences store; locale remains unavailable when no runtime locales exist.
- [x] Sidebar and tab interactions preserve their existing store and controller outcomes, including tab ARIA/data hooks and duplicate-pending suppression.
- [x] `pnpm --filter @noob-naive-ui/admin test -- admin-shell`, `pnpm --filter @noob-naive-ui/admin typecheck`, and `pnpm --filter @noob-naive-ui/admin build` pass.
