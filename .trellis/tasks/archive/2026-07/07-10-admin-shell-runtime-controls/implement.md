# Implementation plan: `AdminShell` with ProLayout, open tabs, and starter-built menu

## Preconditions

- The user reviews and approves the simplified `menuOptions?: MenuOption[]` and `AdminShellTabController` seams in `design.md`.
- The active host/test Pinia instance is initialized explicitly before mounting `AdminShell`.
- The starter constructs the full menu tree, including visibility and click behavior, supplies it as `menuOptions`, implements tab callbacks with its own router, and puts `<router-view />` in the default slot. `@noob-naive-ui/admin` never imports `vue-router`.

## Ordered work

1. **Verify and remove the obsolete visibility type.**
   - Use LSP references for exported `AdminRouteVisibility` before editing it.
   - Migrate every actual caller if one exists; otherwise remove only that type/export from `packages/admin/src/runtime-contract.ts` and the public barrel.
   - Retain `AdminMenuTree` and `AdminRouteKey`; they are existing harmless public aliases and this task does not need to break them.

2. **Add the explicit library dependency boundary.**
   - Add `pro-naive-ui: ^3.2.3` as both a peer and dev dependency in `packages/admin/package.json`.
   - Regenerate the pnpm lockfile through the repository package-manager workflow.
   - Add `pro-naive-ui` to `packages/admin/vite.config.ts` externals.
   - Do not add or externalize `vue-router`.

3. **Write failing shell component tests** in `packages/admin/tests/admin-shell.test.ts`.
   - Mount real Vue apps in happy-dom with `createPinia()` active and `useAdminShellPreferencesStore().initialize()` called explicitly.
   - Assert loading/anonymous branches render neither ProLayout sidebar/tabbar nor default-slot content; anonymous delegates to the existing login UI.
   - Assert authenticated ProLayout content is enclosed by a wrapper with a definite `height: 100dvh` / `h-dvh` declaration, not only a `min-height`, and forwards only the default-slot synthetic marker standing in for starter `<router-view />`.
   - Pass nested `MenuOption[]` with starter-owned rendered-label/link content. Assert the authenticated sidebar composes exactly the supplied option structure; it must not hide/filter/normalize/re-key options, attach a shell menu callback, or create a menu controller.
   - Assert absent/empty menu input does not render a sidebar. Assert no public sidebar/tabbar slots exist.
   - Assert tab opening/deduplication/label updates, host-controlled highlight, pending action suppression, resolved-close removal, rejected-close retention/error, non-closable behavior, and no public tabbar slot.
   - Assert authenticated → loading → authenticated, authenticated → anonymous → authenticated, and controller-removal transitions clear tabs; only a later host-reported tab opens.
   - Exercise each preference control and assert public store state plus accessible UI state. Verify locale is disabled without options and changes after initialized locale options exist.

4. **Implement `AdminShell`** in `packages/admin/src/components/admin-shell.tsx`.
   - Use `defineComponent`, typed `PropType` props, and a TSX render closure, matching `AdminLoginPage`.
   - Define/export only `AdminShellTab`, `AdminShellTabController`, and `AdminShellProps` as new frontend-ready types. Type `menuOptions` directly as `MenuOption[]`.
   - Branch only on `authStatus.kind`; delegate anonymous UI to `AdminLoginPage`.
   - In authenticated state, render `ProLayout` inside a definite `height: 100dvh` / `h-dvh` wrapper; bind its collapsed interface to preferences; pass `menuOptions` directly to internal `NMenu` in `#sidebar` only when non-empty; render local tabs in `#tabbar`; put controls in documented navigation slots; forward only `slots.default?.()` to default content.
   - Do not inspect menu entries, attach menu selection handlers, add a menu helper/component, derive route state, or import a router. Await tab host actions, derive active tab state only from the controller, clear local tabs on auth/controller transitions, and never parse storage or add a global provider.

5. **Expose the intentional public surface** in `packages/admin/src/index.ts`.
   - Add `AdminShell`, `AdminShellProps`, `AdminShellTab`, and `AdminShellTabController` only.
   - Remove the obsolete visibility type export after its definition/callers are removed.
   - Preserve existing CSS side-effect import and all unrelated exports. Do not re-export `ProLayout` or Naive primitives.

6. **Run focused verification.**
   - `pnpm --filter @noob-naive-ui/admin test -- admin-shell`
   - `pnpm --filter @noob-naive-ui/admin typecheck`
   - `pnpm --filter @noob-naive-ui/admin build`

7. **Review before completion.**
   - Confirm `packages/admin` source/types/dependencies contain no `vue-router`, router objects, route records, backend DTOs, sessions, permissions, transport, query state, menu filtering, menu visibility state, or business pages.
   - Confirm the starter-supplied `MenuOption[]` flows unchanged to internal `NMenu`; only the default content slot crosses from starter to shell.
   - Confirm `pro-naive-ui` is an external peer and neither a public sidebar/tabbar slot nor broad Naive/Pro Naive re-exports exist.
   - Update the merged Task 6 checklist in `docs/agent/todo.md` only after every acceptance and verification item is evidenced.

## Rollback points

- If `menuOptions` cannot be rendered directly without a route/router adapter, stop and return to planning; the starter must construct a complete Naive menu tree.
- If `AdminRouteVisibility` has callers outside this task, migrate those callers or retain it; do not leave a stale public export or a compatibility alias.
- If ProLayout cannot build/test as an external peer at the pinned range, stop before modifying public shell types.
- The change is additive and non-persistent except for the verified visibility-type removal: removing the dependency, component, export, and tests restores prior behavior without data migration.
