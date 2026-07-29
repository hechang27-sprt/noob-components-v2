## Parent

#1

## What to build

Allow a host application to restore package-owned Authentication state before protected navigation proceeds. Configuration starts host-owned restoration unconditionally, including when no presentation identity is cached, so HttpOnly-cookie sessions, host-owned tokens, authentication SDKs, in-memory authentication, and preloaded identity use one frontend-ready contract.

The runtime exposes loading, authenticated, and ordinary anonymous outcomes without treating host session data as package state. Router guards wait for the current restoration result, never render protected content optimistically, and continue to the requested protected destination only after authentication succeeds. The backend-free demo demonstrates the host boundary.

## Acceptance criteria

- [ ] Configuring auth starts restoration unconditionally and exposes loading while the host effect is pending.
- [ ] A successful restore result establishes fresh Authentication presentation identity and allows protected navigation.
- [ ] An ordinary unauthenticated restore result reaches login without an eviction message.
- [ ] Restoration works when no browser identity cache exists.
- [ ] Protected content is not rendered and protected navigation is not admitted before restoration resolves.
- [ ] Router waiters always settle when the current restoration settles.
- [ ] Authentication presentation identity remains frontend-only; credentials, session models, backend routes, and transport DTOs do not enter shared contracts.
- [ ] The demo supplies a fake restore effect and demonstrates authenticated and unauthenticated startup.
- [ ] Public-store and router integration tests prove the observable startup flow.

## Blocked by

None — can start immediately.
