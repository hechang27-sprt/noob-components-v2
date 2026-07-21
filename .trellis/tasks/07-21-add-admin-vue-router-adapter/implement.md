# Implementation plan

## 1. Scaffold the optional adapter package

- Create `packages/admin-vue-router` using the established library package layout.
- Add ESM export/type/build/test configuration modeled on `packages/admin` without Tailwind/UI plugins or CSS output.
- Declare `@noob-naive-ui/admin`, `vue`, and `vue-router` as peers; install Vue/Vue Router as local dev dependencies.
- Add the package to demo workspace dependencies.

Validation:

```sh
pnpm --filter @noob-naive-ui/admin-vue-router typecheck
pnpm --filter @noob-naive-ui/admin-vue-router build
```

## 2. Implement the registry API test-first

Add adapter tests before implementation covering:

1. generated route records derive `name` from registry keys while retaining host path/component/props;
2. `toLocation` maps a declared codec's params/query/hash to a named location;
3. `fromRoute` rebuilds the canonical destination from a real resolved router location;
4. omitted codec ignores forward params and returns parameterless destination data;
5. unknown destination key throws a clear ordinary `Error`;
6. non-string/unregistered route names return `null`;
7. malformed registered URL state propagates the codec validation error.

Implement the smallest adapter satisfying those observable contracts:

- exported definition and codec types;
- `defineAdminRouteRegistry`;
- `getDefinition`, `toRouteRecords`, `toLocation`, `fromRoute`;
- strict registry-key/name derivation;
- internal parameterless codec.

## 3. Split demo route and shell-tab concerns

- Change `apps/demo/routes.tsx` to declare page components and invoke the adapter registry.
- Remove demo-local generic codec/registry conversion helpers.
- Add `apps/demo/admin-navigation.ts` with an exhaustive nav-key-indexed tab-presentation map and a descriptor factory that supplies `id`, `nav`, `label`, and `closable`.
- Keep the tab policy separate from route records/codecs.

## 4. Migrate demo integration

- Update `App.tsx` to use bound registry `toLocation` on shell navigation.
- Update current-route descriptor restoration to use bound `fromRoute` and replace descriptor navigation with the URL-decoded canonical destination.
- Preserve host-owned `router.push`, history state, descriptor ID choice, menu construction, and fake auth behavior.
- Remove unused duplicated route helper types/functions.

## 5. Verify

Static checks:

```sh
pnpm --filter @noob-naive-ui/admin test
pnpm --filter @noob-naive-ui/admin typecheck
pnpm --filter @noob-naive-ui/admin build
pnpm --filter @noob-naive-ui/admin-vue-router test
pnpm --filter @noob-naive-ui/admin-vue-router typecheck
pnpm --filter @noob-naive-ui/admin-vue-router build
pnpm --filter demo typecheck
pnpm --filter demo build
```

Browser smoke test:

1. log into the fake demo;
2. navigate to reports and open detail;
3. confirm `detail` maps `reportId` into `/detail/:reportId` and route props render the same value;
4. use browser back/forward and confirm destination reconstruction remains URL-authoritative;
5. confirm no console errors/warnings.

## Review gates

- Core admin package has no Vue Router import/dependency.
- Adapter does not create/mutate/install a router or create shell descriptors.
- Route records contain no tab `label` / `closable` metadata.
- Parameterless routes silently omit supplied params and reconstruct none.
- Unknown keys use clear ordinary errors; unrelated routes decode to null.
- No route-specific param conversion remains in `App.tsx`.
