# Design: descendant AdminShell context

## Public contract

Export the following from `@noob-naive-ui/admin`:

```ts
export type AdminShellContext = {
  /** Reactively exposes the host-authoritative active public descriptor. */
  active: ComputedRef<AdminShellTabDescriptor | null>;
  /** Requests navigation through this shell instance's existing resolution path. */
  navigate: AdminShellNavigate;
};

export function useAdminShell(): AdminShellContext;
```

`useAdminShell()` throws a clear composition error when no ancestor `AdminShell` provided a context. It does not offer an optional variant in this change.

## Ownership and data flow

1. Each `AdminShell` creates one stable context during setup.
2. `active` is a computed readonly view of `props.navigation?.active ?? null`; it remains host-authoritative and updates through the existing reactive getter supplied by the host.
3. `navigate` is the shell's existing `requestDestination` function. No second implementation or wrapper changes resolution semantics.
4. The shell provides the context with a module-private typed Vue `InjectionKey`.
5. Descendants resolve the nearest provider through `useAdminShell()`. Vue's hierarchical injection provides instance isolation for nested and concurrent shells.
6. The default scoped slot continues exposing `{ navigate }` for compatibility.

## Demo integration

- `ReportsDemoPage` calls `useAdminShell()` during setup and uses `navigate` directly.
- `DetailDemoPage` reads `active.value?.nav.params?.reportId` during render, narrowing the unknown value before display.
- `App.tsx` renders `<RouterView />` directly as `AdminShell` content. It no longer imports `AdminShellNavigate`, manually constructs routed component props, or uses the RouterView component slot.

## Boundaries

- The injection key remains private so callers cannot provide counterfeit package context as a supported API.
- The public context exposes only public descriptors, never `AdminShellTab` mutable fields.
- The context has no Vue Router types or behavior.
- Resolver functions remain call-scoped arguments to `navigate` and never enter descriptors or context state.

## Compatibility

This is additive. Existing `AdminShell` props, `AdminShellNavigation`, and scoped-slot consumers keep their current behavior. Demo-only prop plumbing is removed.

## Risks and checks

- Providing a newly allocated context during render would destabilize injection; create and provide it once in setup.
- Copying `navigation.active` into a ref would lose host authority; derive it with `computed`.
- A shared/global context would leak between shells; test two mounted providers with distinct adapters.
- Fail-fast behavior must be tested from a component mounted outside a shell.
