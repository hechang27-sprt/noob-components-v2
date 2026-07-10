# TSX Components and Tests

## Component shape

Use compositional Vue setup functions with `defineComponent` and TSX for render functions. `packages/admin/src/components/admin-login-page.tsx` defines typed props with `AdminLoginPageProps`, owns local UI refs, and returns a render closure; it does not use options-style `setup` or raw VNode construction.

Import Naive UI controls directly and use Tailwind utilities for local layout. Package Tailwind scanning is configured in `packages/admin/src/style.css`, which is imported by the public barrel.

## Auth UI behavior

Components consume frontend-ready input and injected callbacks. `AdminLoginPage` calls `props.authActions.login(values)` and does not know transport errors or response shapes. Its status branches render loading, authenticated, and anonymous UI from `AdminAuthStatus`.

For async form actions:

- prevent duplicate submission while pending;
- disable inputs and submit controls while the action is pending;
- use `try`/`catch`/`finally` to clear pending state;
- surface a generic UI-safe failure, never a raw transport error;
- clear stale feedback when the user edits input.

## Accessibility requirements

Use `useId()` for per-instance form IDs, connect labels with `label-props`, provide native input `name`, `autocomplete`, and `required` attributes, and expose loading/error/success state with appropriate `role` and `aria-*` semantics. These are behavior requirements, not cosmetic details.

Do not hardcode field IDs or use anonymous `<div>` feedback in place of meaningful status/alert roles. `packages/admin/tests/admin-login-page.test.ts` mounts two instances specifically to guard label/input uniqueness.

## Test pattern

Use Vitest with the environment required by the test. The login test declares `// @vitest-environment happy-dom`, mounts real Vue apps with `createApp`, and unmounts all apps plus clears `document.body` in `afterEach`.

Test observable DOM behavior: submitted callback values, pending disablement, auth-state branches, label associations, accessible status/alert semantics, rejection sanitization, and feedback reset. Do not assert private refs or source text.

## Verification

```sh
pnpm --filter @noob-naive-ui/admin test -- admin-login-page
pnpm --filter @noob-naive-ui/admin typecheck
```
