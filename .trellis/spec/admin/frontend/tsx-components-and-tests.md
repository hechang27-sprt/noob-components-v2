# TSX Components and Tests

## Component shape

Declare every Vue component in TSX with the Vue 3.3+ functional `defineComponent` overload: the first argument is a setup function that returns the TSX render function, and the second argument is the component options object. Never use the object-style `setup()` declaration. Every `defineComponent` call must provide an explicit `name` option for Vue Devtools and stack-trace debugging, including local and test-only components.

```tsx
const DetailPage = defineComponent(
  /**
   * Creates detail content from component props.
   *
   * @param props - Contains the report identity rendered by this page.
   * @returns A render function for the detail page.
   */
  (props: { reportId: string }) => () => (
    <main>Report detail: {props.reportId}</main>
  ),
  {
    name: "DetailPage",
    props: ["reportId"],
  },
);
```

For components with reactive state or lifecycle work, use a block-bodied first argument and return the TSX render closure. Stateless components may return the render closure directly. Import Naive UI controls directly and use Tailwind utilities for local layout. Package Tailwind scanning is configured in `packages/admin/src/style.css`, which is imported by the public barrel.

## Naive UI control composition

Prefer direct Naive UI primitives over hand-authored native controls. In `AdminShell`, use `NButton` for immediate actions and compose persistent multi-option choices as immediate hover-triggered `NDropdown` controls:

```tsx
<NDropdown trigger="hover" delay={0} options={options} onSelect={setPreference}>
  <NButton attr-type="button">{label}</NButton>
</NDropdown>
```

Do not turn binary actions into menus. The theme button directly toggles `dark` against explicit `light`, while font size and locale remain dropdown choices. `NDropdown` emits a `string | number` option key; guard or narrow that value before calling a typed store action. Its option menu renders in the document-level popup layer, so component tests must open the trigger, await Vue rendering, and query `document` for the visible option rather than limiting queries to the mounted shell container.

Render the shell tab strip with controlled `NTabs type="card"` and direct `NTab` children. Do not use `NTabPane`: routed content remains in `ProLayout`'s default slot. Key tabs by immutable page-instance ID, derive selection from `navigation.active.id`, and route menu/tab/close operations through the single discriminated `handleNavigation` boundary. Descendants use `useAdminShell()` for reactive active public state and `navigate(destination)`; the scoped default slot retains the same navigation control for compatibility.

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
