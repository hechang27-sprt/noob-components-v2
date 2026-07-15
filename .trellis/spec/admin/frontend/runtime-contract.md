# Frontend Runtime Contract

## Package boundary

`packages/admin/src/runtime-contract.ts` is the contract boundary. It models only rendering-relevant frontend information.

- `AdminAuthStatus` is a discriminated loading/anonymous/authenticated union, not a backend user or session.
- `AdminAuthActions` receives frontend form values through callbacks.
- `AdminMenuTree` is Naive UI `MenuOption[]`; it remains an existing public alias, while `AdminShell` accepts direct starter-built `MenuOption[]` without a visibility contract.
- `AdminShellPreferences` contains frontend-local shell settings.

Keep additions frontend-ready and minimal. The public barrel, `packages/admin/src/index.ts`, exports types, the preferences store, `AdminLoginPage`, and `AdminShell`; add exports there intentionally rather than reaching into internals.

## AdminShell contract

### 1. Scope / trigger

`AdminShell` is the authenticated frontend frame. It owns only presentation, runtime preference controls, and local open-tab membership. The starter owns auth restoration, routing, menu derivation, and the content supplied through the default slot.

### 2. Signatures

```ts
export type AdminShellTabInput = {
  key: string;
  label: string;
  closable?: boolean;
};

export type AdminShellTab = AdminShellTabInput & {
  index: number;
  activationPendingVersion?: number;
  closePendingVersion?: number;
};

export type AdminShellTabController = {
  current: AdminShellTabInput | null;
  activate: (key: string) => Promise<void>;
  close: (closedKey: string, suggestedNextKey: string | null) => Promise<void>;
};

export type AdminShellProps = {
  authStatus: AdminAuthStatus;
  authActions: AdminAuthActions;
  menuOptions?: MenuOption[];
  tabController?: AdminShellTabController;
};
```

### 3. Contracts

- Loading and anonymous states render no layout/sidebar/tabbar/default-slot content; anonymous delegates login UX to `AdminLoginPage` with the supplied actions.
- The authenticated state mounts `ProLayout` in a definite-height `height: 100dvh` container, binds its collapsed state to `useAdminShellPreferencesStore`, and forwards only the default slot as content.
- `menuOptions` is starter-owned opaque input. Pass the exact array reference directly to internal `NMenu`; do not inspect, clone, filter, re-key, or handle selection. Bind only `NMenu.value` to `tabController.current.key` so host-authoritative route changes keep the menu highlight synchronized.
- `tabController.current` is an authoritative host descriptor, while `AdminShellTab` is shell-local state carrying visible-order index and per-operation ownership. The shell awaits `activate` and `close`; it updates membership only after a resolved close and invalidates pending actions when authentication or the controller changes.
- Theme, font size, locale, and sidebar controls call the existing preferences-store actions. Locale options remain runtime-only; controls never parse or persist storage.
- Authenticated header presentation stays frontend-only: the `nav-left` sidebar control and `nav-right` theme/font/locale/account controls use `NIcon` with `@vicons/ionicons5`. Font, locale, and account dropdowns use immediate `trigger="hover"`/`delay={0}`. The account trigger shows only a generic icon and `userLabel` fallback, and its sole option invokes `authActions.logout`.
- The theme control is a direct action, not a dropdown: `dark` renders sun and selects `light`; `light` and `system` render moon and select `dark`. Its accessible name describes that next action.
- Tab presentation uses controlled `NTabs type="card"` with direct `NTab` children and no `NTabPane`. Bind the host-authoritative current key to `value`, gate transitions through `onBeforeLeave`, request activation through `onUpdateValue`, and request shell-owned closure through `onClose`; never recreate tabs from `NButton` controls.

### 4. Validation and error matrix

| Condition | Shell behavior |
| --- | --- |
| No menu options or an empty array | Do not render the sidebar. |
| No tab controller | Do not render tabbar or retain tabs. |
| `activate` or `close` rejects | Retain tab membership/highlight; show only generic UI-safe feedback. |
| Close callback resolves | Look up the closed key in the **current** visible order, then remove both that key and its map record and reindex. A pre-await index is only valid for the callback's suggested-next key because concurrent closes can shift visible order. |
| Auth leaves authenticated or controller changes | Clear local tabs and invalidate prior async tab actions. |
| Account menu selects `logout` | Invoke only the supplied `authActions.logout`; do not model a session or add a second logout flow. |

### 5. Good, base, and bad cases

- Good: the starter builds nested `MenuOption[]` with router-aware label content and supplies `<router-view />` in the default slot.
- Base: the starter reports a current tab and implements async activation/close callbacks; `AdminShell` renders its local tab UI without importing routing code.
- Bad: passing a router object, backend session, visibility set, menu-selection callback, or storage adapter to `AdminShell`.

### 6. Tests required

`packages/admin/tests/admin-shell.test.ts` must observably cover every auth branch, default-slot isolation, defined-height `ProLayout`, unchanged menu composition, tab-driven menu-highlight synchronization, empty-menu absence, store-backed controls, host-descriptor versus shell-state separation, visible-order updates, async success/failure/pending behavior, and auth/controller cleanup.
It must also cover icon-only accessible names, immediate hover menu selection, action-oriented theme glyph mapping, account logout delegation, native `NTabs`/`NTab` semantics, active/inactive accessibility state, and async activation/close callbacks.

### 7. Wrong vs correct

```tsx
// Wrong: the runtime takes ownership of starter navigation.
<NMenu options={props.menuOptions.filter(isVisible)} onUpdateValue={router.push} />;

// Correct: direct opaque starter composition.
<NMenu options={props.menuOptions} />;
```

## Required separation

The shared runtime must not import or define backend routes, request/response DTOs, transport clients, session/user models, permission payloads, TanStack Query ownership, or packaged business CRUD pages. `docs/agent/admin-runtime-contract.md` assigns those responsibilities to the starter/app.

The starter derives the final `MenuOption[]`, including visibility, hierarchy, and router-aware link/rendered-label content. The runtime renders it unchanged with direct Naive composition; it must not filter visibility, normalize menu keys, own route selection, or receive a router. `AdminRouteVisibility` is obsolete and must be removed only after callers are migrated or verified absent.

## Dependencies and build

`packages/admin/package.json` declares Vue, Pinia, Naive UI, and Pro Naive UI as peers; `@noob-naive-ui/ui`, `@vicons/ionicons5`, and Zod are implementation dependencies. `packages/admin/vite.config.ts` builds `src/index.ts` as an ES library with Vue JSX and Tailwind plugins, and externalizes every runtime import: those three implementation dependencies plus the four peers. Preserve this boundary when adding imports or build features.

Avoid broad Naive/Pro Naive re-exports. Import and compose primitives directly inside admin runtime components, as `packages/admin/src/components/admin-login-page.tsx` and `packages/admin/src/components/admin-shell.tsx` do.

## Verification

Type-check and build the package after public-contract changes. Add or update an observable test whenever a contract branch changes; `packages/admin/tests/admin-login-page.test.ts` and `packages/admin/tests/admin-shell.test.ts` demonstrate testing all auth-status variants rather than only the anonymous happy path.
