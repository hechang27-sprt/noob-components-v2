# Implementation plan: AdminShell UI polish

## Ordered implementation

1. Declare `@vicons/ionicons5` for the admin package and externalize it from the library build.
2. Add compact Naive UI/Vicons header controls, direct theme action, and account logout composition; remove the demo's duplicate default-slot logout button.
3. Replace custom tab buttons with controlled `NTabs`/`NTab`, retain the host-authoritative async lifecycle, and bind `NMenu.value` to the active controller key.
4. Add demo serve-only source aliases for exact admin/UI roots and stylesheet subpaths; browser-prove admin TSX and UI CSS HMR without restarting.
5. Update focused tests for hover menus, header placement, accessible Vicons controls, logout, direct theme glyph behavior, NTabs activation/close semantics, and tab-driven menu synchronization.
6. Browser-verify the authenticated shell, direct theme toggle, hover menus, account logout, NTabs activation/close, menu highlight synchronization, and responsive header behavior.
7. Run admin typecheck, all admin tests, admin build, demo typecheck, and demo build.
8. Run Trellis quality review, capture durable component conventions, commit the reviewed change, and archive the task.

## Validation commands

```sh
pnpm --filter @noob-naive-ui/admin test -- admin-shell
pnpm --filter @noob-naive-ui/admin typecheck
pnpm --filter @noob-naive-ui/admin test
pnpm --filter @noob-naive-ui/admin build
```

Use the existing demo dev command and Chromium after source verification; inspect console output and interact with hover dropdowns rather than treating the DOM unit test as visual proof.

## Risk and rollback

- Header dropdowns use `delay={0}` so happy-dom and Chromium observe the requested immediate hover behavior without arbitrary waits.
- Header slot alignment depends on ProLayout slot semantics. Keep its existing `nav-right` slot and add only the established companion `nav-left` slot after source/type validation.
- `trigger="hover"` can make menu selection delicate if the popup closes. Use the library trigger, not custom timers/state.
- Vicons must be declared and externalized rather than imported through an implicit transitive dependency.
- Revert the manifest, lockfile, Vite config, component, and test together to restore current presentation; no contracts or stored data require rollback.
