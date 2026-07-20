# Expose AdminShell destination requests

## Goal

Let application components rendered anywhere beneath `AdminShell`, especially routed page components, request shell page-instance navigation without threading the scoped-slot `navigate` callback through `RouterView` and routed-component props.

## Background

- `AdminShell` currently implements the destination request operation as its private `requestDestination(destination, resolveTabNavigation?)` function.
- The shell exposes that operation only as the default scoped-slot value `{ navigate }`.
- `apps/demo/src/App.tsx:276-316` must therefore capture `navigate`, wrap `RouterView`, and manually add it to every routed component's props.
- `apps/demo/src/routes.tsx:50-94` duplicates the public function signature as `NavigateToDestination` and declares a `navigate` prop solely to receive that control.
- The package already exports the equivalent function contract as `AdminShellNavigate`.
- `@noob-naive-ui/admin` must remain router-neutral; the host still owns interpretation and persistence of destinations.

## Requirements

- Export one idiomatic Vue composable that returns the nearest ancestor `AdminShell` context: the existing destination-request control and a reactive readonly view of the host-authoritative active public descriptor.
- Preserve the existing scoped-slot `navigate` API for compatibility.
- Keep the operation scoped to one mounted shell instance; do not introduce a global singleton or package-owned router.
- Preserve call-scoped `AdminShellTabNavigationResolver` behavior and the current `Promise<void>` contract.
- Remove the demo's `RouterView` navigation-prop bridge and its duplicated navigation function type.
- Keep active descriptor params separate from the destination-request control and URL query parameters while making them directly readable from the injected shell context.
- Document every new public symbol and internal state according to repository authoring rules.
- Fail fast with a clear error when the descendant-access composable is used outside an `AdminShell`.

## Acceptance Criteria
- [x] A routed descendant can obtain both the nearest `AdminShell` destination request operation and reactive active public descriptor directly from `@noob-naive-ui/admin`.
- [x] Calling it exercises the same open/activate resolution and host `handleNavigation` path as menu and scoped-slot navigation.
- [x] Multiple nested or concurrently mounted shells cannot leak navigation controls across instance boundaries.
- [x] `App.tsx` renders `RouterView` normally without a custom slot or routed-component prop bridge.
- [x] Existing scoped-slot consumers retain their current behavior and types.
- [x] Admin tests cover descendant access and misuse behavior; admin and demo typecheck/build pass, and the demo navigation flow is browser-verified.

## Out of Scope

- Giving `@noob-naive-ui/admin` knowledge of Vue Router.
- Moving host route resolution or browser-history ownership into the package.
- Redesigning destination parameter storage, URL mapping, or host-owned router/history behavior.

