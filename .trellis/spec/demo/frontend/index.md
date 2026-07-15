# `demo` Frontend Guidelines

`apps/demo` is the runnable, backend-free reference for consuming `@noob-naive-ui/admin`. It demonstrates the starter/application boundary; it does not replace or scaffold `apps/admin-starter`.

## Pre-Development Checklist

Before changing the demo, read:

1. [Runtime Integration Contract](./runtime-integration-contract.md) for auth, routing, menu, tab, preference, stylesheet, or command changes.
2. `.trellis/spec/admin/frontend/runtime-contract.md` for the public shell contract.
3. `.trellis/spec/guides/cross-layer-thinking-guide.md` for application/runtime ownership.

## Quality Check

```sh
pnpm --filter @noob-naive-ui/admin test
pnpm --filter demo typecheck
pnpm --filter demo build
```

Then start `pnpm --filter demo dev` and verify the anonymous login, authenticated route/menu/tab flow, sign out, preferences, zero browser-console warnings/errors, and no application API request.
