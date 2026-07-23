# Design

## Decision
Use a host-owned transient navigation scope ID and lazy replacement of expired history entries. Do not add session identity to the router-neutral `AdminShellTabDescriptor`, and do not try to pop or enumerate the browser history stack.

## Ownership
- The host creates a cryptographically random scope ID whenever authentication enters a new authenticated session. It remains in memory and is not an authentication credential.
- The Vue Router integration stamps the scope ID beside adapter tab metadata under `_noobAdminShell`.
- A host route guard owns protected-route authorization and chooses the safe destination for missing or mismatched scope metadata.
- `AdminShell` remains unaware of auth sessions and browser history.

## History behavior
1. Login creates a new scope ID and replaces the current entry with the safe home descriptor stamped for that scope.
2. Each adapter open, activate, or close writes the current scope ID.
3. Logout invalidates the in-memory scope and replaces the current protected entry with login.
4. On Back/Forward, the host guard compares protected-entry metadata with the current scope before allowing the route to render.
5. Anonymous protected entries replace to login. Authenticated mismatched or missing-scope entries replace to the current session's safe home descriptor.
6. Replacement lazily heals each stale stack position without adding redirect loops.

## Why not pop history
The History API exposes traversal by relative delta but does not expose the stack, its length within the application, or arbitrary deletion. Repeated `history.go()` cannot safely identify application-owned entries, crosses origin/document boundaries unpredictably, and races asynchronous navigation. Clearing the stack is therefore neither portable nor reliable.

## Contract shape
Prefer an adapter option that reads the current scope at request time rather than embedding it in public shell descriptors:

```ts
type AdminShellVueRouterNavigationOptions<...> = {
  // existing options
  getNavigationScopeId: () => string;
};
```

Persisted metadata becomes:

```ts
{
  scopeId: string;
  tab: { id: string; label: string; closable?: boolean };
}
```

The adapter validates metadata structurally. The host guard determines whether a scope mismatch redirects; the adapter must not infer login routes or auth state.

## Security invariant
A matching scope ID only establishes page-instance continuity. It never establishes authentication or authorization. Every protected route still requires host-owned auth checks.

## Compatibility
This is a behavioral contract change for adapter consumers. If the option is required, all consumers migrate in one cutover. If non-authenticated applications must remain supported, model explicit scope policy rather than silently treating absent scope as globally valid.
