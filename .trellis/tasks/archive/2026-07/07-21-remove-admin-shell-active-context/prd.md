# Remove active from useAdminShell

## Goal

Make `useAdminShell()` a command-only descendant API so routed pages cannot consume host-authoritative active descriptors as a hidden page-input channel.

## Requirements

- Remove `active` from the public `AdminShellContext` type and provided context object.
- Preserve `navigate` behavior and `AdminShellNavigation.active`, which remains the host-to-shell authority used internally by `AdminShell`.
- Migrate every descendant consumer and test through a clean cutover; add no alias or compatibility shim.
- In the demo detail page, replace `useAdminShell().active.nav.params` rendering input with an explicit Vue Router path parameter exposed as a route component prop.
- Preserve router-neutral `AdminShellDestination.params` as navigation input; the demo host maps `reportId` into the explicit detail-route path parameter.
- Replace the demo route-definition array/path lookup with a dedicated object mapping stable semantic `navKey` values to host-owned route definitions; nav keys must remain independent from URL paths.
- Update architecture/spec documentation describing the descendant context.

## Acceptance Criteria

- [ ] `useAdminShell()` returns only `navigate`.
- [ ] Admin shell navigation/context tests pass without reading descendant `active`.
- [ ] The demo detail URL explicitly contains `reportId`, and the detail component receives it as a prop.
- [ ] The demo resolves menu and shell destinations through the explicit nav-key route map rather than searching routes by path.
- [ ] No descendant consumer reads `useAdminShell().active`.
- [ ] Admin tests/typecheck/build and demo typecheck/build pass.
