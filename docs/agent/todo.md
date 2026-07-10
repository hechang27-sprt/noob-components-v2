# Phase 0 Todo: Phase 1 implementation preparation

## Phase 1: Workspace foundation

- [x] Task 1: Establish workspace root and toolchain baseline.
  - [x] Add root workspace manifest and package globs for `packages/ui`, `packages/admin`, `apps/admin-starter`.
  - [x] Add root scripts for `install`, `build`, `typecheck`, and starter `dev` flow.
  - [x] Add shared TypeScript baseline and repo hygiene files.
  - [x] Verify: `pnpm install`
  - [x] Verify: `pnpm build`
  - [x] Verify: `pnpm typecheck`
- [x] Task 2: Scaffold `@noob-naive-ui/ui` with a narrow Naive bridge/value-add entry.
  - [x] Add package manifest, tsconfig, and Vite build config.
  - [x] Add typed entrypoint and minimal bridge/helper source.
  - [x] Confirm no broad Naive re-exports or wrapper parity.
  - [x] Verify: `pnpm --filter @noob-naive-ui/ui build`
  - [x] Verify: `pnpm --filter @noob-naive-ui/ui typecheck`
- [x] Task 3: Scaffold `@noob-naive-ui/admin` public API and frontend-only contract types.
  - [x] Add package manifest, tsconfig, and Vite build config.
  - [x] Export the ratified runtime contract types.
  - [x] Confirm no backend DTO/session/transport types leak into the public API.
  - [x] Verify: `pnpm --filter @noob-naive-ui/admin build`
  - [x] Verify: `pnpm --filter @noob-naive-ui/admin typecheck`

## Checkpoint: Foundation

- [x] Workspace install succeeds.
- [x] All package builds/typechecks succeed.
- [x] Public package boundaries match the contract docs.

## Phase 2: Admin runtime vertical slice

- [x] Task 4: Implement runtime-owned shell preferences store with local persistence.
  - [x] Add Pinia-based preferences store in `@noob-naive-ui/admin`.
  - [x] Persist theme/locale/sidebar state locally without backend coupling.
  - [x] Verify: `pnpm --filter @noob-naive-ui/admin typecheck`
  - [x] Verify: targeted store test for shell preferences. [INFERENCE]
  - [x] Manual verify: package-level demo harness or targeted runtime test proves shell preferences persist across reload or storage rehydration.
- [x] Task 5: Implement `AdminLoginPage` and auth-shell primitives.
  - [x] Build packaged login page using `AdminLoginValues` and `AdminAuthActions`.
  - [x] Keep login UI replaceable by the starter.
  - [x] Verify: `pnpm --filter @noob-naive-ui/admin build`
  - [x] Verify: targeted login component test. [INFERENCE]
  - [x] Manual verify: package-level demo harness or targeted component test shows and submits packaged login page.
- [x] Task 6: Implement `AdminShell` layout, runtime controls, open tabs, and starter-built sidebar menu.
  - [x] Build loading/login/authenticated switching; use `ProLayout` as the authenticated frame with a defined page-height wrapper.
  - [x] Keep the default slot router-free and starter-owned; it is where the starter places `<router-view />`. `@noob-naive-ui/admin` must not import or depend on `vue-router`.
  - [x] Render the starter-supplied `MenuOption[]` unchanged in ProLayout's internal sidebar. The starter owns visibility, hierarchy, and router-aware label/link content; admin has no navigation/visibility controller or filtering logic.
  - [x] Implement browser-like open-tab state/UI inside `AdminShell` through ProLayout's internal `tabbar` slot; expose no `tabbar` slot and use a frontend-only tab controller for starter navigation callbacks.
  - [x] Build theme/language/sidebar controls backed by the runtime preferences store and ProLayout's collapsed interface.
  - [x] Verify: `pnpm --filter @noob-naive-ui/admin build`
  - [x] Verify: `pnpm --filter @noob-naive-ui/admin typecheck`
  - [x] Manual verify: targeted component test covers all auth layouts, unchanged sidebar-menu composition, default-slot isolation, open/activate/close tab behavior, tab cleanup across auth/controller transitions, router-free boundary, ProLayout sizing, and preference controls.

> Task 7 is merged into Task 6. The runtime no longer composes navigation visibility; the starter supplies its final `MenuOption[]` tree directly.

## Checkpoint: Runtime slice

- [x] Runtime package builds cleanly.
- [x] Package-level runtime tests or demo harnesses cover preferences, login shell, direct starter-menu composition, and open tabs.
- [x] No runtime code depends on backend DTOs, transport clients, or business pages.

## Phase 3: Starter proof and DX validation

- [ ] Task 8: Scaffold the starter app shell and direct Naive/Tailwind assembly.
  - [ ] Create app entry, root component, router shell, and package-local Vite/type config.
  - [ ] Configure Tailwind 4 and Naive UI directly in starter app assembly.
  - [ ] Consume `@noob-naive-ui/ui` and `@noob-naive-ui/admin` through their public package surfaces.
  - [ ] Verify: `pnpm --filter admin-starter build` or chosen starter package name.
  - [ ] Verify: starter dev smoke run. [INFERENCE]
  - [ ] Manual verify: starter renders a basic app frame with Naive provider and Tailwind styles active.
- [ ] Task 9: Wire starter-owned auth/menu/route derivation into the runtime proof flow.
  - [ ] Add starter-owned auth state and login/logout callbacks.
  - [ ] Build the final `MenuOption[]` directly from starter route/navigation definitions, including any visibility and router-aware link/label behavior.
  - [ ] Mount `AdminShell` with packaged login page, starter-built menu, and one authenticated content route.
  - [ ] Verify: `pnpm --filter admin-starter build` or chosen starter package name.
  - [ ] Verify: starter dev smoke run plus browser/manual checks. [INFERENCE]
  - [ ] Manual verify: starter signs in, renders authenticated shell, and updates its supplied menu tree when its own navigation state changes.
- [ ] Task 10: Validate end-to-end proof, docs alignment, and remaining boundary notes.
  - [ ] Run final workspace verification from repo root.
  - [ ] Compare implementation against runtime-contract and boundary-map docs.
  - [ ] Update docs only for implementation-grounded clarifications.
  - [ ] Verify: `pnpm build`
  - [ ] Verify: `pnpm typecheck`
  - [ ] Verify: `pnpm test` or the targeted introduced test set. [INFERENCE]
- [ ] Manual verify: browser smoke confirms login flow, shell rendering, starter-built menu, open tabs, and preference persistence.

## Checkpoint: Complete

- [ ] End-to-end starter smoke flow reaches login shell and authenticated shell and proves the intended architecture.
- [ ] Workspace build/typecheck passes.
- [ ] Docs reflect implementation-grounded boundary clarifications.
- [ ] Ready to begin subsequent feature slices.
