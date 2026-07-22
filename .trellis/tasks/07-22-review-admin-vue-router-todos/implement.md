# Implementation plan

## 1. Expand the route codec contract — red/green

- Add a clean-cutover contract test/update for `AdminShellDestination.payload`; remove every `AdminShellDestination.params` use across admin, adapter, demo, tests, and docs.
- Update registry tests first to import `VueRouterNavParams` and pass history state into `fromRoute`.
- Add failing tests for URL-only, history-only, mixed, codec-precedence, and omitted-codec behavior.
- Add failing schema tests proving forward validation before encode, reverse validation after decode, normalized/defaulted output, required-payload rejection, and unchanged Zod error propagation.
- Add `expectTypeOf` coverage proving an inline codec's `encode(payload)` parameter is inferred from its concrete `payloadSchema` without explicit generic annotation or casts.
- Run focused tests and confirm failures against the current API.
- Rename `AdminShellDestination.params` and the codec `encode` parameter to `payload`, reserving `VueRouterNavParams.params` for Vue Router path params.
- Add optional `state: HistoryState`; pass current state into codec decoding and registry `fromRoute`.
- Add codec-owned generic `payloadSchema`; type `encode` from schema output and `decode` from schema input, parsing through the schema in both directions.
- Add Zod 4 to adapter peer dependencies and the existing root-owned development dependency set; do not duplicate it as a package-local dev dependency.
- Run registry tests and adapter typecheck.

## 2. Add higher-level navigation/history adapter — red/green

- Add tests with a real router using `createMemoryHistory()`.
- Cover codec state preservation; metadata-only persistence; valid/malformed metadata restoration; stable direct-entry fallback; open/activate/close behavior; close-current replacement; and reserved `_noobAdminShell` collision errors.
- Confirm tests fail because the factory does not exist.
- Add private Zod validation for adapter-owned `id`/`label`/`closable` metadata.
- Implement and export `createAdminShellVueRouterNavigation` plus documented option types.
- Define:

  ```ts
  const DEFAULT_ADMIN_SHELL_HISTORY_STATE_KEY = "_noobAdminShell";
  const historyStateKey = DEFAULT_ADMIN_SHELL_HISTORY_STATE_KEY;
  ```

- Use `historyStateKey` for every collision check, state write, and state read, preserving one seam for later configurability without exposing an option now.
- Read current state through `router.options.history.state`; preserve codec state; clone and merge only metadata.
- Run adapter tests, typecheck, and build.

## 3. Migrate the demo

- Update codecs to the new decode signature and pass router history state to registry reverse conversion.
- Replace `App.tsx` local clone/type guard/history restoration/request handling with one factory call.
- Keep `describeDemoDestination` and presentation policy in `admin-navigation.ts`.
- Simplify login home navigation and let the adapter construct direct-route fallback metadata.
- Keep the detail codec URL-only while shared tests demonstrate history-only and mixed policies.
- Remove resolved TODOs and obsolete imports/state/functions.
- Run demo typecheck and build.

## 4. Browser verification

- Start the demo and log in.
- Navigate reports → non-menu detail.
- Confirm the URL contains the report ID for the demo's URL-only codec.
- Inspect history state and confirm `_noobAdminShell` contains tab metadata but no duplicate `nav`, `navKey`, or destination payload.
- Exercise browser back/forward and confirm exact tab identity/presentation plus codec-reconstructed payload.
- Confirm no console errors or warnings.

## 5. Full check and documentation

- Run workspace typecheck and changed-package tests/builds after the final code edit.
- Review public declarations and confirm core admin has no persistence API.
- Update docs with `VueRouterNavParams`, codec-controlled URL/history policy, default `_noobAdminShell` namespace, metadata-only persistence, and higher-level adapter ownership.
- Record isolated use of Vue Router's Alpha `RouterHistory.state` API and official source links.
- Validate the Trellis task. Do not archive until implementation and browser behavior are verified and finish-work begins.

## Rollback points

- The expanded codec contract can land independently.
- If the higher-level adapter is unsuitable, retain codec state support and implement metadata-only persistence locally; do not broaden `AdminRouteRegistry` into a live-router owner.
- Demo migration can revert independently without restoring duplicate destination persistence.
