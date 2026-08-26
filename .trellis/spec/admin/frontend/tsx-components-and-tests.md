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

For components with reactive state or lifecycle work, use a block-bodied first argument and return the TSX render closure. Stateless components may return the render closure directly. Import Naive UI controls directly; for layout and text prefer Naive UI primitives that consume design tokens over raw HTML + Tailwind — see [Design tokens and theming](#design-tokens-and-theming). Package Tailwind scanning is configured in `packages/admin/src/style.css`, which is imported by the public barrel.

### JSX compiler: vue-jsx-vapor

This project uses `vue-jsx-vapor` as the JSX Vite plugin (replacing `@vitejs/plugin-vue-jsx`). It provides Rust-based (Oxc) JSX compilation — ~35× faster than babel — and avoids the babel slot-flag crash that breaks naive-ui's `optimize: true`.

Configuration in each `vite.config.ts`:
```ts
import vueJsxVapor from 'vue-jsx-vapor/vite'
export default defineConfig({ plugins: [vueJsxVapor({ interop: true, macros: true })] })
```

`interop: true` enables `defineVaporComponent` support (used in packages/ui for vapor-native components). `macros: true` enables Vue macros (`defineModel`, `defineSlots`). Components using `defineComponent` compile to standard VDOM output (`createBaseVNode`).

## Design tokens and theming

New UI components (pages, widgets, shells) MUST be compatible with Naive UI's design tokens and theming so they remain theme-able across dark mode, the font-size preference, and `FONT_SIZE_OVERRIDES`. Do not hardcode colors, font sizes, or spacing that a theme override should control.

### Hardcoded style is forbidden

Avoid raw color classes, hex literals, and fixed font-size utilities in component markup:

```tsx
// ❌ hardcoded color + size bypass the theme
<span class="text-sm! text-gray-600">status</span>

// ❌ raw text element bypasses Typography tokens
<h1 class="text-xl font-semibold">Title</h1>
```

Instead consume Naive UI primitives that derive from the theme:

```tsx
// ✅ Typography drives pFontSize / headerFontSizeN from FONT_SIZE_OVERRIDES
<NP>status</NP>
<NH1>Title</NH1>
```

### Text: use Typography, not raw HTML

Render content-ful text with Naive UI Typography components (`NH1`–`NH6`, `NP`, `NText`) rather than `<p>`/`<h1>`/`<span>`. They emit the same DOM tags (`NP` → `<p>`, `NH1` → `<h1>`) so selector-based tests still pass, and they inherit the themed `--n-font-size` / `--n-margin` / `--n-text-color`.

Text containers that only stack Typography should be a plain `<div>` (or `NElement`), not an `NFlex`: Typography already supplies its own vertical margins, and `NFlex`'s component-size `gap` then double-spaces the text.

### Layout: prefer NFlex/NLayout/NGrid

Prefer `NFlex`/`NLayout`/`NGrid` over raw `<main>`/`<div>` + Tailwind for layout so gaps, background, and alignment stay token-driven. Do not pass `size` to `NFlex` unless a specific gap is intended — the default `size="medium"` resolves the `Flex.gapMedium` token, themed per font-size tier in `FONT_SIZE_OVERRIDES`.

### Smaller-than-base text via NElement + a common token

Naive UI Typography has no "caption" tier smaller than `pFontSize` — `NText`/`NP` expose no size prop, and `fontSizeTiny` is only consumed by tiny *components*, not text. To size text below base, render it through `NElement` and reference the inherited kebab-cased common token:

```tsx
<span role="status">
  <NElement tag="p" class="text-(length:--font-size-tiny)">
    {anonymousStatusMessage}
  </NElement>
</span>
```

`NElement` emits every `common` theme var as an inherited custom property on its own element (e.g. `fontSizeTiny` → `--font-size-tiny`, no `n-` prefix), honoring `FONT_SIZE_OVERRIDES`. Reference it with a Tailwind v4 CSS-var utility, not an inline `style`.

> **Warning**: Tailwind's bare `text-(--var)` shorthand is the **color** namespace — it compiles to `color: var(--var)`, not `font-size`. For text sizing you MUST disambiguate with `text-(length:--var)` (→ `font-size: var(--var)`). The bare form silently sizes nothing (computed font-size stays at the inherited value).

Keep the `role="status"`/`role="alert"` wrapper outside `NElement`, which hardcodes `role="none"` on its root. Inject `NElement` locally at the consuming text — do not wrap the whole app in one, because Naive UI only exposes these vars where `NElement` mounts (the config-provider root and `NGlobalStyle` set only the base `fontSize`).

### Full-page backgrounds require NGlobalStyle

Naive UI paints the page `body` background only through `NGlobalStyle` inside `NConfigProvider`. `NFlex`/`NLayout` have no background of their own (NLayout uses its themed `--n-color` only when mounted). To make dark mode cover the entire page (e.g. a full-page login), mount `<NGlobalStyle />` in the host and use a full-viewport `NFlex` wrapper (`vertical justify="center" align="center" class="min-h-dvh"`).

### Rem-based Tailwind utilities are allowed

Tailwind sizing/padding utilities (`p-6`, `h-48`, `max-w-md`) are acceptable for local layout because the host sets `document.documentElement.style.fontSize` from the font-size preference, so `rem` values scale with it. Hardcoded `px` and color utilities are not.

## Naive UI control composition

Prefer direct Naive UI primitives over hand-authored native controls. In `AdminShell`, use `NButton` for immediate actions and compose persistent multi-option choices as immediate hover-triggered `NDropdown` controls:

```tsx
<NDropdown trigger="hover" delay={0} options={options} onSelect={setPreference}>
  <NButton attr-type="button">{label}</NButton>
</NDropdown>
```

Do not turn binary actions into menus. The theme button directly toggles `dark` against explicit `light`, while font size and locale remain dropdown choices. `NDropdown` emits a `string | number` option key; guard or narrow that value before calling a typed store action. Its option menu renders in the document-level popup layer, so component tests must open the trigger, await Vue rendering, and query `document` for the visible option rather than limiting queries to the mounted shell container.

Render the shell tab strip with controlled `NTabs type="card"` and direct `NTab` children. Do not use `NTabPane`: routed content remains in `ProLayout`'s default slot. Key tabs by immutable page-instance ID, derive selection from `navigation.active.id`, and route menu/tab/close operations through the single discriminated `handleNavigation` boundary. Descendants use command-only `useAdminShell().navigate(destination)`; host-authoritative active state is not provided to pages, and the scoped default slot retains the same navigation control for compatibility.

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
