# Implementation Plan: Phase 0 planning for the admin-first rewrite

## Overview

Phase 0 planning converts the ratified architecture docs under `docs/agent` into an implementation-ready Phase 1 execution plan for `noob-components-v2`. The first implementation target is a minimal but real workspace proving the intended product seams: `@noob-naive-ui/ui` as a value-add layer on top of directly co-consumed Naive UI, `@noob-naive-ui/admin` as a frontend-only shell/runtime, and one backend-specific starter that derives frontend-ready auth/navigation inputs and consumes the runtime end to end.

## Architecture Decisions

- Use a pnpm workspace with three day-one workspaces: `packages/ui`, `packages/admin`, and `apps/admin-starter`. Rationale: this proves the runtime/library/template split without introducing an internal shared package prematurely.
- Do **not** create an internal shared package initially. Rationale: shared code pressure is still hypothetical; introducing it now would weaken the package boundary before real reuse emerges.
- Treat Naive UI as a direct peer dependency for both library consumers and the starter. Rationale: wrapper parity is explicitly rejected; the proof slice should show direct `naive-ui` usage at app level and narrow value-add exports from `@noob-naive-ui/ui`.
- Keep `@noob-naive-ui/admin` frontend-only. Rationale: the starter, not the runtime, owns backend integration, route registry, auth/session derivation, and visibility mapping.
- Make the first vertical slice the admin shell flow, not a generic UI component port. Rationale: the product target is admin-app builders, and the shell/runtime seam is the highest-risk boundary to prove early.
- Use `MenuOption[]` plus `visibleRouteKeys` exactly as documented in `docs/agent/admin-runtime-contract.md`. Rationale: the contract is already ratified; Phase 1 should validate it, not redesign it.
- Prefer starter-owned Tailwind 4 setup in the first slice. Rationale: Tailwind consumption is app-shell assembly; no package helper is justified until multiple starters need the same setup. [INFERENCE]

## Dependency Graph

```text
Workspace root config
  ├── TypeScript/Vite/shared tooling baseline
  │     ├── @noob-naive-ui/ui package skeleton
  │     ├── @noob-naive-ui/admin package skeleton
  │     └── apps/admin-starter skeleton
  │
  ├── @noob-naive-ui/admin runtime contracts/types
  │     ├── shell preferences store
  │     ├── login page
  │     ├── shell layout primitives
  │     └── navigation visibility composition
  │
  ├── @noob-naive-ui/ui value-add bridge layer
  │     └── Naive provider/theme helper used by starter/runtime
  │
  └── starter app wiring
        ├── app shell assembly
        ├── frontend-ready auth status derivation
        ├── menu tree + visibleRouteKeys derivation
        └── end-to-end shell proof
```

Implementation order follows this graph. The starter cannot validate the runtime until root tooling and package contracts exist; the runtime should not assume shared helpers until real duplication appears.

## Task List

### Phase 1: Workspace foundation

- [ ] Task 1: Establish workspace root and toolchain baseline.
- [ ] Task 2: Scaffold `@noob-naive-ui/ui` with a narrow Naive bridge/value-add entry.
- [ ] Task 3: Scaffold `@noob-naive-ui/admin` public API and frontend-only contract types.

### Checkpoint: Foundation

- [ ] Workspace install succeeds.
- [ ] Root typecheck/build commands succeed for all workspaces.
- [ ] Public package boundaries match `docs/agent/admin-runtime-contract.md` and `docs/agent/boundary-map.md`.

### Phase 2: Admin runtime vertical slice

- [ ] Task 4: Implement runtime-owned shell preferences store with local persistence.
- [ ] Task 5: Implement `AdminLoginPage` and auth-shell primitives.
- [ ] Task 6: Implement `AdminShell` layout primitives and runtime controls.
- [ ] Task 7: Implement navigation visibility composition using `MenuOption[]` and `visibleRouteKeys`.

### Checkpoint: Runtime slice

- [ ] Runtime package builds cleanly.
- [ ] Package-level runtime tests or demo harnesses cover preferences, login shell, and navigation visibility without depending on the starter app.
- [ ] No runtime code depends on backend DTOs, transport clients, or business pages.

### Phase 3: Starter proof and DX validation

- [ ] Task 8: Scaffold the starter app shell and direct Naive/Tailwind assembly.
- [ ] Task 9: Wire starter-owned auth/menu/route derivation into the runtime proof flow.
- [ ] Task 10: Validate end-to-end proof, docs alignment, and remaining boundary notes.

### Checkpoint: Complete

- [ ] End-to-end starter smoke flow reaches login shell and authenticated shell and proves the intended architecture.
- [ ] Workspace build/typecheck passes.
- [ ] Docs reflect any boundary decisions tightened during implementation.
- [ ] Ready to begin next feature slices (`@noob-naive-ui/ui` specialized widgets, starter-owned business pages).

## Detailed Task Breakdown

## Task 1: Establish workspace root and toolchain baseline

**Description:**
Create the root workspace structure and shared toolchain baseline needed for all later slices. This task should add the root `package.json`, `pnpm-workspace.yaml`, base TypeScript config, shared Vite conventions, and ignore files, while keeping the repo free of implementation-specific package coupling.

**Inputs:**

- `docs/agent/rewrite-plan.md`
- `docs/agent/admin-runtime-contract.md`
- Empty current repo state except docs planning artifacts [OBSERVED]

**Scope / steps:**

- Add root workspace manifest and workspace package globs.
- Add shared TypeScript baseline and any root scripts needed for `build`, `typecheck`, and `dev` fan-out.
- Add root `.gitignore`/workspace hygiene files if missing.
- Decide and encode root package manager/tooling defaults without adding an internal shared package.

**Acceptance criteria:**

- [ ] Root workspace files exist and declare exactly the intended day-one workspaces: `packages/ui`, `packages/admin`, `apps/admin-starter`.
- [ ] Root scripts provide a single obvious way to install, build, and typecheck the workspace.
- [ ] No internal shared package is created.

**Verification:**

- [ ] Command succeeds: `pnpm install`
- [ ] Command succeeds: `pnpm build`
- [ ] Command succeeds: `pnpm typecheck`
- [ ] Manual check: repo tree shows only the planned root workspaces, with no `packages/shared`-style package.

**Dependencies:** None

**Files likely touched:**

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.json`
- `.gitignore`
- `vite.config.ts` or package-local Vite configs [INFERENCE]

**Estimated scope:** Medium (3-5 files)

## Task 2: Scaffold `@noob-naive-ui/ui` with a narrow Naive bridge/value-add entry

**Description:**
Create the `@noob-naive-ui/ui` package skeleton with a deliberately narrow surface: a package manifest, build config, typed entrypoint, and one minimal provider/theme helper or equivalent bridge proving the package adds value without wrapping Naive UI broadly.

**Inputs:**

- `docs/agent/boundary-map.md`
- Task 1 workspace/tooling baseline

**Scope / steps:**

- Add `packages/ui` package manifest and package-local build/type config.
- Create a single public entry module plus initial source directory structure.
- Export only the narrow Phase 1 bridge/helper surface; do not re-export Naive UI primitives.
- Keep Tailwind app assembly out of the package unless a concrete need appears.

**Acceptance criteria:**

- [ ] `@noob-naive-ui/ui` builds as an isolated package in the workspace.
- [ ] Its public entry exports only narrow Phase 1 value-add helpers, not `NButton`/`NInput`-style wrapper parity or broad Naive re-exports.
- [ ] Package metadata is compatible with direct co-consumption by the starter and external apps.

**Verification:**

- [ ] Command succeeds: `pnpm --filter @noob-naive-ui/ui build`
- [ ] Command succeeds: `pnpm --filter @noob-naive-ui/ui typecheck`
- [ ] Manual check: `packages/ui/src/index.ts` exports only the planned bridge/helper API.

**Dependencies:** Task 1

**Files likely touched:**

- `packages/ui/package.json`
- `packages/ui/tsconfig.json`
- `packages/ui/vite.config.ts`
- `packages/ui/src/index.ts`
- `packages/ui/src/*`

**Estimated scope:** Medium (3-5 files)

## Task 3: Scaffold `@noob-naive-ui/admin` public API and frontend-only contract types

**Description:**
Create the `@noob-naive-ui/admin` package skeleton and lock in the frontend-only runtime contract as real exported TypeScript types and entrypoints. This task is about compile-time boundary enforcement, not yet about rendering the full shell.

**Inputs:**

- `docs/agent/admin-runtime-contract.md`
- Task 1 workspace/tooling baseline

**Scope / steps:**

- Add `packages/admin` package manifest and package-local build/type config.
- Create entry modules for runtime types and component exports.
- Implement and export the ratified contract types: `AdminAuthStatus`, `AdminLoginValues`, `AdminAuthActions`, `AdminRouteKey`, `AdminRouteVisibility`, `AdminMenuTree`, `AdminShellPreferences`.
- Keep placeholder runtime components minimal but typed if needed for package compilation.

**Acceptance criteria:**

- [ ] `@noob-naive-ui/admin` exports the frontend-only contract types named in `docs/agent/admin-runtime-contract.md`.
- [ ] No exported admin type mentions backend DTOs, transport clients, sessions, or permission payloads.
- [ ] Package builds independently inside the workspace.

**Verification:**

- [ ] Command succeeds: `pnpm --filter @noob-naive-ui/admin build`
- [ ] Command succeeds: `pnpm --filter @noob-naive-ui/admin typecheck`
- [ ] Manual check: exported admin type names and meanings match the Phase 0 contract doc.

**Dependencies:** Task 1

**Files likely touched:**

- `packages/admin/package.json`
- `packages/admin/tsconfig.json`
- `packages/admin/vite.config.ts`
- `packages/admin/src/index.ts`
- `packages/admin/src/runtime-contract.ts`

**Estimated scope:** Medium (3-5 files)

## Task 4: Implement runtime-owned shell preferences store with local persistence

**Description:**
Add the first real runtime behavior to `@noob-naive-ui/admin`: a Pinia-backed shell preferences store for theme mode, font size, locale, and sidebar state, including runtime-owned local persistence. This proves the shell can own frontend-local state without learning backend state.

**Inputs:**

- Task 3 exported contract types
- Ratified persistence decision from `docs/agent/admin-runtime-contract.md`

**Scope / steps:**

- Add a Pinia store or equivalent runtime helper in `packages/admin`.
- Persist shell-local preferences to browser storage through a minimal adapter.
- Keep storage keys and persistence format internal to the runtime unless a real external need appears.
- Ensure store defaults are compatible with starter injection and future shell usage.

**Acceptance criteria:**

- [ ] Runtime owns theme mode, font size, locale, available locales, and sidebar collapsed state as frontend-local shell state.
- [ ] Preferences survive reload via local persistence in the browser.
- [ ] No persisted shape depends on backend user/session data.

**Verification:**

- [ ] Command succeeds: `pnpm --filter @noob-naive-ui/admin typecheck`
- [ ] Command succeeds: `pnpm --filter @noob-naive-ui/admin test -- --runInBand shell-preferences` or equivalent targeted store test. [INFERENCE]
- [ ] Manual check: a package-level demo harness or targeted runtime test proves theme/locale/sidebar state persists across reload or storage rehydration.

**Dependencies:** Task 3

**Files likely touched:**

- `packages/admin/src/stores/*`
- `packages/admin/src/runtime/*`
- `packages/admin/src/index.ts`
- `packages/admin/tests/*` [INFERENCE]

**Estimated scope:** Medium (3-5 files)

## Task 5: Implement `AdminLoginPage` and auth-shell primitives

**Description:**
Build the packaged but replaceable login page and minimal auth-shell primitives in `@noob-naive-ui/admin`. The page should consume `AdminAuthActions` and frontend-ready auth status, manage form UX, and stay ignorant of transport and backend DTOs.

**Inputs:**

- Task 3 contract exports
- Task 2 `@noob-naive-ui/ui` bridge/helper if needed for provider integration

**Scope / steps:**

- Implement `AdminLoginPage` with username/password/remember fields matching the Phase 0 contract.
- Add pending/error/success UX at the component level without embedding backend semantics.
- Make replacement straightforward by keeping the contract input-driven rather than hard-coding app composition.

**Acceptance criteria:**

- [ ] `AdminLoginPage` consumes `AdminLoginValues` and `AdminAuthActions.login` rather than any transport client.
- [ ] The packaged login page can render anonymous/loading/authenticated states appropriately for the starter proof.
- [ ] The login page is optional/replaceable from the starter without breaking the runtime contract.

**Verification:**

- [ ] Command succeeds: `pnpm --filter @noob-naive-ui/admin build`
- [ ] Command succeeds: `pnpm --filter @noob-naive-ui/admin test -- --runInBand admin-login-page` or equivalent targeted component test. [INFERENCE]
- [ ] Manual check: a package-level demo harness or targeted component test shows the packaged login page in anonymous state and submits via an injected callback.

**Dependencies:** Task 3; Task 2 only if UI bridge is used by the login implementation

**Files likely touched:**

- `packages/admin/src/components/AdminLoginPage.vue`
- `packages/admin/src/components/*`
- `packages/admin/src/index.ts`
- `packages/admin/tests/*` [INFERENCE]

**Estimated scope:** Medium (3-5 files)

## Task 6: Implement `AdminShell` layout primitives and runtime controls

**Description:**
Build the shell frame itself: header, sidebar container, content slot, theme controls, language controls, and auth-state-aware top-level layout switching. This task stops short of route visibility filtering logic so the file scope stays narrow and the visibility seam stays explicit.

**Inputs:**

- Task 4 shell preferences store
- Task 5 login/auth primitives
- Task 3 exported shell-facing types

**Scope / steps:**

- Implement `AdminShell` frame and related shell-control components.
- Wire theme, locale, font size, and sidebar collapsed state into the shell UI.
- Support anonymous/loading/authenticated shell state transitions at the layout level.
- Keep the content area slot-based and starter-owned.

**Acceptance criteria:**

- [ ] `AdminShell` can render loading, anonymous, and authenticated top-level layouts without backend awareness.
- [ ] Shell controls read/write the runtime preferences store.
- [ ] Route content remains starter-owned through slots/props; no packaged business pages are introduced.

**Verification:**

- [ ] Command succeeds: `pnpm --filter @noob-naive-ui/admin build`
- [ ] Command succeeds: `pnpm --filter @noob-naive-ui/admin typecheck`
- [ ] Manual check: a package-level demo harness or targeted component test can switch between loading, login, and authenticated shell layouts while theme/locale/sidebar controls remain functional.

**Dependencies:** Tasks 4 and 5

**Files likely touched:**

- `packages/admin/src/components/AdminShell.vue`
- `packages/admin/src/components/AdminThemeControls.vue`
- `packages/admin/src/components/AdminLanguageControls.vue`
- `packages/admin/src/components/AdminHeader.vue` [INFERENCE]
- `packages/admin/src/index.ts`

**Estimated scope:** Medium (3-5 files)

## Task 7: Implement navigation visibility composition using `MenuOption[]` and `visibleRouteKeys`

**Description:**
Add the navigation-specific runtime layer separately from the general shell frame. This task owns menu rendering, `MenuOption.key` matching, and visible-route filtering, but does not take over route registry ownership from the starter.

**Inputs:**

- Task 3 contract exports
- Task 6 shell frame

**Scope / steps:**

- Implement `AdminNavigation` or equivalent menu component.
- Filter or derive renderable menu entries from `MenuOption[]` and `visibleRouteKeys`.
- Connect navigation selection/output into `AdminShell` without taking ownership of route definitions.
- Preserve the invariant that `MenuOption.key` is the canonical frontend visibility key.

**Acceptance criteria:**

- [ ] Navigation rendering is driven by `AdminMenuTree` and `AdminRouteVisibility` only.
- [ ] Hidden route keys do not render in shell navigation.
- [ ] Runtime still does not own route registry, backend menu DTOs, or business pages.

**Verification:**

- [ ] Command succeeds: `pnpm --filter @noob-naive-ui/admin build`
- [ ] Command succeeds: `pnpm --filter @noob-naive-ui/admin typecheck`
- [ ] Manual check: a package-level demo harness or targeted component test hides entries whose keys are missing from `visibleRouteKeys` and shows entries whose keys are present.

**Dependencies:** Task 6

**Files likely touched:**

- `packages/admin/src/components/AdminNavigation.vue`
- `packages/admin/src/runtime/navigation.ts` [INFERENCE]
- `packages/admin/src/components/AdminShell.vue`
- `packages/admin/src/index.ts`
- `packages/admin/tests/*` [INFERENCE]

**Estimated scope:** Medium (3-5 files)

## Task 8: Scaffold the starter app shell and direct Naive/Tailwind assembly

**Description:**
Create the starter application skeleton and prove app-level assembly concerns stay in the app. This task sets up the Vue/Vite app, Tailwind 4, Pinia, Naive UI provider usage, router shell, and package consumption points, but does not yet implement full auth/menu derivation.

**Inputs:**

- Tasks 1-3 package outputs
- Day-one architecture decisions in this plan

**Scope / steps:**

- Add `apps/admin-starter` manifest and package-local Vite/type config.
- Add `src/main.ts`, app root, router shell, and Tailwind/Naive provider setup.
- Consume `@noob-naive-ui/ui` and `@noob-naive-ui/admin` packages in app assembly.
- Keep route/menu/auth state derivation thin until Task 9.

**Acceptance criteria:**

- [ ] Starter boots as a standalone workspace app.
- [ ] Starter configures Tailwind 4 and Naive UI directly at app level.
- [ ] Starter imports `@noob-naive-ui/ui` and `@noob-naive-ui/admin` through their public package surfaces.

**Verification:**

- [ ] Command succeeds: `pnpm --filter admin-starter build` or the actual starter package name chosen in implementation.
- [ ] Command succeeds: `pnpm --filter admin-starter dev` smoke start. [INFERENCE]
- [ ] Manual check: starter renders a basic app frame with Naive provider and Tailwind styles active.

**Dependencies:** Tasks 1, 2, 3

**Files likely touched:**

- `apps/admin-starter/package.json`
- `apps/admin-starter/vite.config.ts`
- `apps/admin-starter/tsconfig.json`
- `apps/admin-starter/src/main.ts`
- `apps/admin-starter/src/App.vue`

**Estimated scope:** Medium (3-5 files)

## Task 9: Wire starter-owned auth/menu/route derivation into the runtime proof flow

**Description:**
Finish the starter proof by deriving frontend-ready auth status, menu tree, and `visibleRouteKeys` inside starter code and passing them into `@noob-naive-ui/admin`. This task proves the boundary that backend-shaped concerns stay outside the runtime even when the starter uses local/mock data first.

**Inputs:**

- Tasks 4-8 outputs
- `docs/agent/admin-runtime-contract.md`

**Scope / steps:**

- Add starter-owned auth state and login/logout callbacks.
- Define starter routes/content and derive `AdminMenuTree` plus `visibleRouteKeys` from them.
- Mount `AdminShell` with packaged login page and authenticated content route.
- Keep all backend-shaped/mock derivation local to starter code.

**Acceptance criteria:**

- [ ] Starter, not `@noob-naive-ui/admin`, owns route registry and derives frontend-ready auth/menu/visibility inputs.
- [ ] Running the starter demonstrates the packaged login page, authenticated shell, and at least one visible content route.
- [ ] Starter uses direct Naive UI components in app code alongside runtime package components.

**Verification:**

- [ ] Command succeeds: `pnpm --filter admin-starter build` or the actual starter package name chosen in implementation.
- [ ] Command succeeds: `pnpm --filter admin-starter dev` smoke start, then browser/manual verification. [INFERENCE]
- [ ] Manual check: starter can sign in through the packaged login page, render the authenticated shell, and show/hide menu entries by changing `visibleRouteKeys`.

**Dependencies:** Tasks 4, 5, 6, 7, 8

**Files likely touched:**

- `apps/admin-starter/src/App.vue`
- `apps/admin-starter/src/router/*`
- `apps/admin-starter/src/auth/*`
- `apps/admin-starter/src/navigation/*`
- `apps/admin-starter/src/views/*`

**Estimated scope:** Medium (3-5 files)

## Task 10: Validate end-to-end proof, docs alignment, and remaining boundary notes

**Description:**
Perform the first integrated verification pass after the proof slice works. This task updates docs only where implementation taught something new, records any tightened boundary decisions, and ensures the workspace can be handed off as the Phase 1 baseline for subsequent feature work.

**Inputs:**

- Tasks 1-9 completed workspace
- Existing docs under `docs/agent`

**Scope / steps:**

- Run the final workspace verification commands.
- Compare actual package surfaces against the contract docs and boundary map.
- Update `docs/agent` only where implementation clarified an ambiguity or forced a decision.
- Record any deferred items explicitly rather than silently expanding scope.

**Acceptance criteria:**

- [ ] Workspace verification commands pass from the repo root.
- [ ] Any doc updates are constrained to implementation-grounded clarifications.
- [ ] Remaining deferred work is explicit: no silent expansion into business pages, shared package extraction, or full `@noob-naive-ui/ui` component migration.

**Verification:**

- [ ] Command succeeds: `pnpm build`
- [ ] Command succeeds: `pnpm typecheck`
- [ ] Command succeeds: `pnpm test` or the targeted workspace test set actually introduced during Tasks 4-9. [INFERENCE]
- [ ] Manual check: browser smoke confirms login flow, shell rendering, menu visibility, and shell preference persistence.

**Dependencies:** Tasks 1-9

**Files likely touched:**

- `docs/agent/rewrite-plan.md`
- `docs/agent/admin-runtime-contract.md`
- `docs/agent/boundary-map.md`
- `tasks/todo.md`
- `tasks/plan.md`

**Estimated scope:** Small (1-2 files) to Medium (3-5 files), depending on doc corrections

## Parallelization Opportunities

- After Task 1 settles workspace conventions, Task 2 (`@noob-naive-ui/ui` entry) and Task 3 (`@noob-naive-ui/admin` API surface/types) can proceed in parallel if both obey the ratified contracts.
- After Task 3 lands the admin contract surface, Task 4 (preferences store) and Task 5 (login page) can proceed in parallel.
- Task 6 should stay sequential after Tasks 4 and 5 because it integrates both runtime state and auth-shell primitives.
- Task 7 should stay sequential after Task 6 because it composes visibility logic into the shell frame.
- Task 8 can begin once Tasks 1-3 settle package surfaces.
- Task 9 should stay sequential after Tasks 4-8 because it proves the integrated runtime/starter seam.
- Task 10 stays last.

## Risks and Mitigations

| Risk                                                                              | Impact | Mitigation                                                                                                                                |
| --------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Shared code pressure appears immediately between `ui`, `admin`, and starter       | Medium | Start duplicated but local; extract only after two concrete callsites prove the seam.                                                     |
| Runtime contract is still too vague for starter wiring                            | High   | Treat `AdminAuthStatus`, `AdminAuthActions`, `AdminRouteVisibility`, and `AdminMenuTree` as compile-time package exports early in Task 3. |
| Naive UI provider/theming responsibilities get split awkwardly across packages    | Medium | Keep the provider bridge minimal in `@noob-naive-ui/ui`; let the starter own app assembly and prove a single obvious setup path.          |
| Shell runtime accidentally absorbs backend concerns during starter implementation | High   | Put all backend-shaped derivation in the starter from day one; reject any runtime type that mentions DTOs, sessions, or transport.        |
| Task sizing drifts beyond medium during shell/starter work                        | Medium | Split shell frame from navigation visibility and split starter scaffolding from starter-owned derivation, as above.                       |
| Verification commands drift from actual scripts created in Task 1                 | Low    | Normalize script names in Task 1 and update this plan only if implementation requires a better root command contract.                     |

## Open Questions

- Whether the workspace should standardize on `vitest` from day one or defer automated tests until the first non-trivial logic seam is in place. Recommended default: add Vitest once Task 4 introduces store logic worth testing. [INFERENCE]
- Whether the first `@noob-naive-ui/ui` proof export should be only a provider/theme helper or include one tiny value-add composite as well. Recommended default: keep it to the bridge/helper first. [INFERENCE]
- Whether the starter should simulate backend auth entirely locally or include a minimal adapter/mock service boundary from day one. Recommended default: local starter-owned mock/auth derivation, because the runtime seam matters more than transport realism. [INFERENCE]

## Verification Gate Before Implementation

- [x] Every task below has explicit scope, acceptance criteria, and verification.
- [x] Dependency order is bottom-up and leaves the workspace runnable after each checkpoint.
- [x] No task requires an internal shared package from day one.
- [x] No task is planned above ~5 files without being split.
- [x] The first vertical slice proves the product boundary (`admin` runtime + starter) rather than generic wrapper churn.
- [ ] Human approves this plan before implementation begins.
