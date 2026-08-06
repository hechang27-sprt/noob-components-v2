# Workspace locale JSON HMR boundaries + AdminShell HMR tab-state reset

## Goal

Dev-mode HMR must update text and styles in place without destroying user-visible state:

1. Editing `apps/demo/src/locales/demo.json` updates rendered text in place, with **no full page reload** and **no app-side `import.meta.hot.accept` patch** — `createWorkspaceVueI18nPlugin()` owns the boundary generically for plain-`.ts` aggregator modules.
2. Editing AdminShell slot components (`packages/admin/src/components/admin-shell-tabbar.tsx`, `admin-shell-navbar-controls.tsx`) must not reset the shell's open-tab registry to only the active tab.

## Background (confirmed by inspection + browser verification)

- **Preset gap (locale HMR).** `createWorkspaceLocaleHmrPlugin`'s HMR companion only recorded `.vue/.tsx/.jsx` importers. `demo.json` is imported only from plain `apps/demo/src/i18n.ts`, which is not self-accepting → no boundary → full reload. (A second full-reload source — `@tailwindcss/vite` auto-scanning `.json` under the app root — was already fixed separately via `source(none)` + `@source` allow-list in `apps/demo/src/style.css`.)
- **Tabbar reset (shell HMR).** `AdminShellTabbar`, `AdminShellNavLeft`, `AdminShellNavRight` are plain function components, which `@vitejs/plugin-vue-jsx` does **not** hot-register (only `const X = defineComponent(...)` matches). An edit to such a module propagates to the hot `AdminShell` component. Vue's `reload` marks instances dirty (`hmrDirtyComponents`); `isSameVNodeType` then forces `unmount + mount` of AdminShell. The fresh `useAdminShellTabs` setup runs its immediate watch with `previous === undefined` → `clearTabs()` → only `navigation.active` is re-recorded → the tab bar collapses to the active tab. Proven in browser: shell DOM node replaced (`shellSame: false`), `beforeunload` counter 0.
- **Same root cause class remains for other triggers** whose HMR boundary is the shell itself: edits to `packages/admin/src/locales/AdminShell.json` / `AdminLoginPage.json` (imported by `admin-shell.tsx`), `admin-shell.tsx`, or `use-admin-shell-tabs.ts` all remount the shell and collapse tabs. Verified for `AdminShell.json`.
- The Intlify virtual-module propagation model (`virtual:intlify-i18n-<N>`), the two boundary kinds, and the reload-proof browser methodology (beforeunload counter in `sessionStorage`) are documented in the `noob-workspace-locale-hmr-boundaries` skill.

## Requirements

- R1 (done, verified): the preset injects the locale accept boundary itself for modules that both import a workspace `src/locales/*.json` and create a Vue I18n composer (`createI18n`/`createComposer`) at top level; no app-side HMR code.
- R2 (done, verified): editing `admin-shell-tabbar.tsx` / `admin-shell-navbar-controls.tsx` must not reset the open-tab registry (slot components declared with `defineComponent` so plugin-vue-jsx hot-registers them).
- R3: editing `packages/*/src/locales/*.json` updates text in place without collapsing the tab list (scope per Q1 in Open Questions).
- R4: no regression to settled contracts: router-neutral AdminShell controller, navigation store keeps controllers out of serializable Pinia state, heal/`knownPageIds` membership policy, multi-shell nearest-ancestor injection.

## Acceptance criteria

- AC1 (verified): edit `apps/demo/src/locales/demo.json` → rendered text updates in place; `sessionStorage` beforeunload counter stays 0; all open tabs preserved; shell DOM node not replaced. `apps/demo/src/i18n.ts` contains no `import.meta.hot` block.
- AC2 (verified): edit `packages/admin/src/components/admin-shell-tabbar.tsx` (Tailwind class and JS-only changes) → no reload; all open tabs preserved; the new class/prop applies; server `DEBUG=vite:hmr` log shows the update bounded at `admin-shell-tabbar.tsx` (self-accept), not `admin-shell.tsx`.
- AC3 (pending approval of Part C): edit `packages/admin/src/locales/AdminShell.json` → text updates in place; all open tabs preserved.
- AC4: quality gates pass — `pnpm --filter admin typecheck`, `pnpm --filter admin-vue-router typecheck`, `pnpm --filter demo typecheck`, root `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm exec oxfmt --check`, `pnpm exec oxlint --type-aware` on changed files, `pnpm --filter demo build`, admin/admin-vue-router/demo test suites.

## Out of scope

- State survival for arbitrary host-owned shell state (only the package AdminShell tab registry is considered).
- HMR full reloads caused by anything other than the two mechanisms above.
- Production behavior: the preset is serve-only; built consumers and standalone package builds are unaffected (verified contract in `library-i18n-contract.md`).

## Open questions

- Q1 (resolved in design, pending approval): Part C state-survival scope — **Option P (Pinia-backed tab registry)** chosen over the adapter-tracked registry and sessionStorage alternatives; see `design.md`. Awaiting the user's approval of the planning summary before `task.py start`.
