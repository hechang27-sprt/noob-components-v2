# Task 6 existing package contracts and test patterns

## Existing component shape

`packages/admin/src/components/admin-login-page.tsx` is the only component and is the pattern to reuse:

- Imports Naive controls directly from `naive-ui` (`NButton`, `NCard`, `NForm`, `NFormItem`, `NInput`, `NResult`, `NSpin`); there is no local wrapper layer.
- Uses `defineComponent` with a setup function and TSX render closure, typed `AdminLoginPageProps`, and `PropType` declarations. Avoid options-style components or hand-built raw VNodes.
- Uses Tailwind utility classes for layout and imports package CSS through the barrel (`packages/admin/src/style.css`). The stylesheet imports Tailwind theme/utilities and scans `./components`.
- Uses `useId()` for per-instance IDs and meaningful native/accessibility semantics. This is relevant to any new header/control buttons and auth-state status region.
- Auth branches are driven solely by `props.authStatus.kind`: loading renders an `aria-busy` loading `<main>`, authenticated renders a status/result view, and anonymous renders the login form. The shell can reuse/delegate this existing component rather than duplicate login UX.
- `AdminLoginPageProps` is `{ authStatus: AdminAuthStatus; authActions: AdminAuthActions }`; login callbacks are injected and transport errors are sanitized. `AdminShell` should preserve this callback-only boundary.

## Existing Pinia store API

`packages/admin/src/stores/shell-preferences.ts` exports the setup-style store `useAdminShellPreferencesStore` with ID `admin-shell-preferences`. It exposes refs plus a computed immutable-ish snapshot:

- refs: `themeMode`, `fontSize`, `locale`, `availableLocales`, `sidebarCollapsed`, `isHydrated`;
- snapshot: `preferences: AdminShellPreferences`, cloning locale option objects;
- initialization: `initialize(options?: AdminShellPreferencesStoreOptions)`; call before relying on hydrated state;
- setters: `setThemeMode(AdminThemeMode)`, `setFontSize(AdminFontSize)`, `setLocale(string)`, `setAvailableLocales(AdminLocaleOption[])`, `setSidebarCollapsed(boolean)`;
- shell action: `toggleSidebar()`;
- whole-state actions: `replacePreferences(Partial<AdminShellPreferences>)`, `reset({ defaults }?)`.

`setAvailableLocales` clones input and realigns `locale` to the first available option (or defaults) when the current key disappears. Controls should use setters/toggle, not mutate arrays or duplicate normalization.

`packages/admin/src/runtime/shell-preferences.ts` owns all external/storage normalization and persistence. It uses Zod to normalize theme/font enums, trimmed non-empty locale strings, locale options, and sidebar booleans; storage key is internal `@noob-naive-ui/admin:shell-preferences`; only theme mode, font size, locale, and sidebar collapsed persist. `availableLocales` is runtime-only. Storage access is safe for SSR, absent/blocked/throwing storage. Components must not parse JSON or implement persistence.

## Build and package constraints

- `packages/admin/package.json`: Vue `^3.5.0`, Pinia `^3.0.4`, Naive UI `^2.43.1` peers; Zod implementation dependency; Vitest `^4.1.10`, happy-dom dev dependency.
- `packages/admin/vite.config.ts`: Vue JSX + Tailwind Vite plugins; ES library entry `src/index.ts`; externalizes `naive-ui`, `pinia`, `vue`, `zod`. New imports must preserve these externals and should not pull backend/application dependencies.
- `packages/admin/tsconfig.json`: `jsx: "preserve"`, `jsxImportSource: "vue"`, declaration output rooted at `src`; include `.ts`/`.tsx`.
- Public barrel imports `./style.css`, exports only explicit runtime API. Add shell/control exports there deliberately; do not broad-re-export Naive primitives.

## Existing test pattern

`packages/admin/tests/admin-login-page.test.ts` is a happy-dom Vitest test:

- file starts `// @vitest-environment happy-dom`;
- mounts real Vue apps via `createApp`, records them in a `mountedApps` array, unmounts all apps and clears `document.body` in `afterEach`;
- asserts observable DOM behavior: auth branches, loading status semantics, form labels/inputs, callback arguments, pending disablement, generic error sanitization, and feedback reset;
- uses `nextTick()`/Promises around event-driven updates and `vi.fn()` callbacks.

For Task 6, follow this style with targeted tests that mount `AdminShell` and verify all three auth status branches, starter-owned slot content appears only in authenticated shell, controls emit/click into store setters, and sidebar collapsed state changes. Do not assert private refs, source text, or incidental class names.

`packages/admin/tests/shell-preferences.test.ts` uses `setActivePinia(createPinia())` in `beforeEach`, injectable in-memory storage adapters, and observable hydration/persistence behavior. Any shell test that uses the store should create an active Pinia and initialize the store explicitly; do not rely on browser `localStorage` or global persistence plugins.

## Relevant UI and CSS source

- `packages/ui/src/theme/naive.ts` only defines the narrow `NoobNaiveThemeBridge` and conversion helper; it does not currently provide admin shell controls or a ConfigProvider.
- `packages/admin/src/style.css` imports `tailwindcss/theme` and `tailwindcss/utilities`, with `@source './components'`; adding component files under `src/components` keeps scanning aligned.
