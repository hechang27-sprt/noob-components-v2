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
- [ ] Task 6: Implement `AdminShell` layout primitives and runtime controls.
  - [ ] Build shell frame, top-level auth-state layout switching, and starter-owned content slot.
  - [ ] Build theme/language/sidebar controls backed by the runtime preferences store.
  - [ ] Verify: `pnpm --filter @noob-naive-ui/admin build`
  - [ ] Verify: `pnpm --filter @noob-naive-ui/admin typecheck`
  - [ ] Manual verify: package-level demo harness or targeted component test switches between loading, login, and authenticated shell layouts.
- [ ] Task 7: Implement navigation visibility composition using `MenuOption[]` and `visibleRouteKeys`.
  - [ ] Build `AdminNavigation` or equivalent menu renderer.
  - [ ] Hide/show entries using `MenuOption.key` matched against `visibleRouteKeys`.
  - [ ] Keep route registry ownership in the starter.
  - [ ] Verify: `pnpm --filter @noob-naive-ui/admin build`
  - [ ] Verify: `pnpm --filter @noob-naive-ui/admin typecheck`
  - [ ] Manual verify: package-level demo harness or targeted component test hides route keys missing from rendered navigation.

## Checkpoint: Runtime slice

- [ ] Runtime package builds cleanly.
- [ ] Package-level runtime tests or demo harnesses cover preferences, login shell, and navigation visibility.
- [ ] No runtime code depends on backend DTOs, transport clients, or business pages.

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
  - [ ] Derive `AdminMenuTree` and `visibleRouteKeys` from starter route/navigation definitions.
  - [ ] Mount `AdminShell` with packaged login page and one authenticated content route.
  - [ ] Verify: `pnpm --filter admin-starter build` or chosen starter package name.
  - [ ] Verify: starter dev smoke run plus browser/manual checks. [INFERENCE]
  - [ ] Manual verify: starter signs in, renders authenticated shell, and changes menu visibility by `visibleRouteKeys`.
- [ ] Task 10: Validate end-to-end proof, docs alignment, and remaining boundary notes.
  - [ ] Run final workspace verification from repo root.
  - [ ] Compare implementation against runtime-contract and boundary-map docs.
  - [ ] Update docs only for implementation-grounded clarifications.
  - [ ] Verify: `pnpm build`
  - [ ] Verify: `pnpm typecheck`
  - [ ] Verify: `pnpm test` or the targeted introduced test set. [INFERENCE]
  - [ ] Manual verify: browser smoke confirms login flow, shell rendering, menu visibility, and preference persistence.

## Checkpoint: Complete

- [ ] End-to-end starter smoke flow reaches login shell and authenticated shell and proves the intended architecture.
- [ ] Workspace build/typecheck passes.
- [ ] Docs reflect implementation-grounded boundary clarifications.
- [ ] Ready to begin subsequent feature slices.
