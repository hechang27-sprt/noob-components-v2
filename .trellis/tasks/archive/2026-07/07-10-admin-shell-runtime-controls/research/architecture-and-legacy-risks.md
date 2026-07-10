# Task 6 architecture and migration-risk findings

## Ratified architecture documents

`docs/agent/admin-runtime-contract.md` describes the old `packages/manage` coupling that the rewrite must avoid: packaged `Views.routes`, app router injection, and shell code fetching/polling backend user/session data. The new runtime owns page shell layout, navigation rendering/application from frontend-ready inputs, theme/language/cosmetic controls, login UI, and shell-local Pinia state only.

`docs/agent/rewrite-plan.md` repeats that `@noob-naive-ui/admin` owns shell composition, auth UI, route/menu visibility application, and layout/theme/language/font-size state, but not business pages, backend-shaped query layers, user/session models, permission payloads, backend route/menu DTOs, or transport. It explicitly defers an internal shared package until concrete reuse exists.

`.trellis/spec/guides/code-reuse-thinking-guide.md` says runtime contracts/preferences normalization/Pinia state belong in `packages/admin/src/runtime*` and `packages/admin/src/stores`; route registries and backend derivation belong in `apps/admin-starter`. Keep one explicit owner and do not extract a helper for a single callsite.

`.trellis/spec/guides/cross-layer-thinking-guide.md` names the data flow `initialization defaults + storage -> Zod normalization -> Pinia store -> component state`, and reverse mutation `store -> detached subscription -> persisted subset`. It requires success/failure tests at changed boundaries and says starter/runtime inputs remain frontend-ready.

`.trellis/spec/admin/frontend/tsx-components-and-tests.md` requires compositional Vue setup + TSX, direct Naive imports, Tailwind layout, and DOM-behavior tests. It specifically calls out auth-state branches, accessible status/alert semantics, and rejection sanitization as observable contracts.

## Legacy controls are historical only

The old package is at `../noob-components/packages/manage/`. Its `head/head.vue` and `head/index.ts` used Element Plus, Vuex, `vue3-i18n`, mutable global `state.size/state.style`, and slot-based left/right header areas. `head/style-change.vue`, `lang-change.vue`, and `size-change.vue` used Element dropdowns and committed Vuex mutations; `head/personal.vue` owns user/logout behavior. These files can explain the conceptual header controls but are not contracts for the new package. Do not carry over:

- Vuex commits/global state, Element components/icons, or legacy `Styles`/`Size` objects;
- backend/session-shaped personal-user behavior;
- legacy locale names (`zh`, `en`) as fixed options;
- old route/page catalog assumptions.

The new equivalents must use the `AdminShellPreferences` store and injected frontend-ready auth callbacks/options. Locale options are dynamic `AdminLocaleOption[]`, not hard-coded legacy menu items.

## Current starter is intentionally absent

`apps/admin-starter` contains only its manifest and stub `dev` script. `.trellis/spec/admin-starter/frontend/current-state-and-ownership.md` forbids inventing app entrypoints, route conventions, auth modules, or build/typecheck scripts before Tasks 8–9. Therefore Task 6 tests should be package-local and use a synthetic slot; no starter code or route registry should be introduced as a shortcut.

## Design risks to surface during implementation

1. **Underspecified shell API:** Docs list likely component names but no exact `AdminShell` props/slots/control props. Keep the first API minimal and frontend-ready; avoid adding backend-shaped abstractions or speculative route props.
2. **Auth branch ownership:** `AdminLoginPage` already renders loading, anonymous, and authenticated status views. A shell should not duplicate login form logic; likely delegate anonymous state to the packaged page or accept a replaceable login slot/component, while still making the top-level branch observable.
3. **Theme application ambiguity:** Existing runtime preference state has theme/font values, but no admin-level theme provider/application helper. Mutating store values is required; applying Naive `GlobalThemeOverrides` is not specified. Avoid importing a speculative bridge or claiming visual theme application without a documented owner.
4. **Hydration timing:** Store state is not guaranteed hydrated until `initialize()` is called. Shell consumers/tests must initialize explicitly and should not silently add a global initialization side effect.
5. **Slot/content ownership:** Authenticated content must be a slot/prop supplied by a later starter. A built-in placeholder page would violate the no-business-pages boundary and make starter ownership ambiguous.
6. **Navigation creep:** Sidebar container can exist without filtering; do not render or derive `AdminMenuTree` until Task 7.
