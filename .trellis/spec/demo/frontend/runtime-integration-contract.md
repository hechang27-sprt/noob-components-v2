# Runtime Integration Contract

## 1. Scope / Trigger

Use this contract when changing `apps/demo` application assembly, its public admin-runtime integration, or its focused commands. The demo is frontend-only: it proves the starter boundary without backend transport, session persistence, DTOs, tokens, or a fake API.

## 2. Signatures

```ts
import type {
  AdminAuthActions,
  AdminAuthStatus,
  AdminShellTabController,
} from "@noob-naive-ui/admin";
import type { MenuOption } from "naive-ui";

const authStatus: Ref<AdminAuthStatus>;
const authActions: AdminAuthActions;
const menuOptions: MenuOption[];
const tabController: AdminShellTabController;
```

Production-focused commands have an admin-build prerequisite, while Vite serve mode resolves admin and UI source directly:

```json
{
  "dev": "vite",
  "prebuild": "pnpm --filter @noob-naive-ui/admin build",
  "pretypecheck": "pnpm --filter @noob-naive-ui/admin build"
}
```

## 3. Contracts

- Import runtime values and types from `@noob-naive-ui/admin`; never use application-source relative imports into `packages/admin`. Demo Vite serve mode may resolve the package specifier to workspace source aliases so library edits participate in HMR, but production build mode must retain artifact resolution.
- Import `@noob-naive-ui/admin/style.css` explicitly in the app entrypoint. Serve-mode aliases must list exact admin/UI `style.css` subpaths before package-root aliases so Vite loads and watches the real source stylesheets.
- Keep auth in a single in-memory `Ref<AdminAuthStatus>`. Login trims username/password and rejects either empty value; successful login uses the username only as a rendering label. Logout routes home and changes auth to the signed-out anonymous state.
- Build the final router-aware `MenuOption[]` in the demo and pass its exact reference to `AdminShell`. The shell gets no router, route-selection callback, visibility input, session, or backend-shaped value.
- Keep one stable `AdminShellTabController`; its `current` getter derives from Vue Router's reactive route. `activate` and `close` await application-owned router navigation. Do not duplicate shell-local visible-tab membership in the application.
- Initialize only `useAdminShellPreferencesStore` in `main.ts`; provide runtime locale options there. Application theme/font presentation reads that same store reactively. Do not add a store, storage adapter, or persistence implementation.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Username or password trims to empty | Reject login; packaged login UI shows its generic safe error and stays anonymous. |
| Non-empty credentials | Navigate home and render authenticated shell with the trimmed username label; no network request. |
| Route changes | Reactive controller reports the new descriptor; shell opens/activates its tab. |
| Shell closes a tab | Controller awaits suggested-next route or home; shell removes its own membership after resolution. |
| OS color scheme changes in system mode | Reactive media listener updates application theme; remove listener on unmount. |
| Focused production command from a clean checkout | Its `pre*` hook builds admin JS, CSS, and declarations first; dev serve instead transforms and watches exact admin/UI source aliases. |

## 5. Good, Base, and Bad Cases

- **Good:** `App.tsx` creates `RouterLink` labels and passes `<RouterView />` in the default slot; it supplies its existing `logout` callback to `AdminShell`, whose authenticated account menu is the sole sign-out UI.
- **Base:** static local route pages with no data fetching, request models, or session restoration.
- **Bad:** a mock `login()` HTTP endpoint, a `SessionDto`, `localStorage` auth restoration, a router prop passed to `AdminShell`, a second preferences store, or importing admin source files directly.

## 6. Tests Required

- `pnpm --filter @noob-naive-ui/admin test` guards the public shell/login contract.
- `pnpm --filter demo typecheck` proves public declarations resolve from a clean state.
- `pnpm --filter demo build` proves the public admin stylesheet and app styles bundle.
- Browser assertions: whitespace rejection; non-empty login; menu route render; tab activation and close; sign out; theme/font/locale/sidebar controls; no console warnings/errors; no application API request.

## 7. Wrong vs Correct

```tsx
// Wrong: bypasses the library public boundary and makes CSS/tooling behavior diverge.
import { AdminShell } from "../../../packages/admin/src";

// Correct: consumes the declared runtime and explicit public stylesheet artifact.
import { AdminShell } from "@noob-naive-ui/admin";
import "@noob-naive-ui/admin/style.css";
```
