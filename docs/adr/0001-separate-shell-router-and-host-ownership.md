# Separate shell, router, and host ownership

The Admin shell remains router-neutral and backend-free, the admin router runtime owns Vue Router and browser-history coordination, and the host application owns authentication effects, backend integration, route definitions, menus, and business pages. This boundary lets the shared packages provide substantial admin behavior without importing application policy or transport contracts.

## Considered options

- A router-aware Admin shell would simplify one integration path but bind the reusable shell to Vue Router lifecycle and history semantics.
- A backend-aware Admin shell would centralize common application behavior but force backend DTOs, session policy, and transport concerns into the shared package.

## Consequences

Hosts must supply explicit frontend-ready contracts and assemble the three owners. In return, shared UI releases remain independent of each host application's backend and routing model.

The [current integration contract](./0002-admin-shell-router-host-contract.md) records the exact responsibilities and runtime flow that implement this decision.
