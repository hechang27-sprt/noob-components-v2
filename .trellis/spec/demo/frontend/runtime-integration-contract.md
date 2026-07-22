# Runtime Integration Contract

## 1. Scope / Trigger

Use this contract when changing `apps/demo` application assembly, its public admin-runtime integration, or its focused commands. The demo is frontend-only: it proves the starter boundary without backend transport, session persistence, DTOs, tokens, or a fake API.

## 2. Signatures

```ts
import type {
  AdminAuthActions,
  AdminAuthStatus,
  AdminShellNavigation,
} from "@noob-naive-ui/admin";
import type { MenuOption } from "naive-ui";

const authStatus: Ref<AdminAuthStatus>;
const authActions: AdminAuthActions;
const menuOptions: MenuOption[];
const navigation: AdminShellNavigation;
```

Production-focused commands build the adapter and its dependencies first, while Vite serve mode resolves admin, admin-vue-router, and UI source directly:

```json
{
  "dev": "vite",
  "prebuild": "pnpm --filter @noob-naive-ui/admin-vue-router build",
  "pretypecheck": "pnpm --filter @noob-naive-ui/admin-vue-router build"
}
```

## 3. Contracts

- Import runtime values and types from `@noob-naive-ui/admin`; never use application-source relative imports into `packages/admin`. Demo Vite serve mode may resolve the package specifier to workspace source aliases so library edits participate in HMR, but production build mode must retain artifact resolution.
- Import `@noob-naive-ui/admin/style.css` explicitly in the app entrypoint. Serve-mode aliases must list exact admin/UI `style.css` subpaths before package-root aliases so Vite loads and watches the real source stylesheets.
- Keep auth in a single in-memory `Ref<AdminAuthStatus>`. Login trims username/password and rejects either empty value; successful login uses the username only as a rendering label. Logout routes home and changes auth to the signed-out anonymous state.
- Build the final `MenuOption[]` with plain labels in the demo and pass its exact reference to `AdminShell`. The shell gets no router, route object, visibility input, session, or backend-shaped value.
- Build one stable `AdminShellNavigation` with `createAdminShellVueRouterNavigation({ router, registry, describeDestination, createPageId })`. The factory owns generic Vue Router/history orchestration; `admin-navigation.ts` retains host tab-presentation policy. Each payload-bearing route codec validates and maps `AdminShellDestination.payload` to explicit Vue Router `params`, `query`, `hash`, `state`, or a mix, then reconstructs canonical payload from the normalized route and current history state. Codec state remains host-owned; the adapter adds only `id`, `label`, and optional `closable` beneath `_noobAdminShell`, never a complete descriptor, `navKey`, or payload. Do not mutate `window.history.state` behind Vue Router or duplicate shell-local membership.
- Initialize only `useAdminShellPreferencesStore` in `main.ts`; provide runtime locale options there. Application theme/font presentation reads that same store reactively. Do not add a store, storage adapter, or persistence implementation.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Username or password trims to empty | Reject login; packaged login UI shows its generic safe error and stays anonymous. |
| Non-empty credentials | Navigate home and render authenticated shell with the trimmed username label; no network request. |
| Route or history changes | Reactive `navigation.active` combines codec-reconstructed canonical payload with persisted adapter tab metadata; sidebar selection follows a matching `navKey`. |
| Shell closes a tab | The close request navigates to its destination-bearing fallback and preserves only the fallback tab metadata (`id`, `label`, optional `closable`) before shell removal. |
| OS color scheme changes in system mode | Reactive media listener updates application theme; remove listener on unmount. |
| Focused production command from a clean checkout | Its `pre*` hook builds admin JS, CSS, and declarations first; dev serve instead transforms and watches exact admin/UI source aliases. |

## 5. Good, Base, and Bad Cases

- **Good:** `routes.tsx` registers host page records/codecs through `@noob-naive-ui/admin-vue-router`'s bound registry; registry keys are both stable shell `navKey` values and generated Vue Router route names, while URL paths remain separate. A payload-bearing codec owns a Zod `payloadSchema`, maps canonical `AdminShellDestination.payload` to Vue Router `params`, `query`, `hash`, `state`, or a mix, and defines reconstruction precedence from normalized route/history state; omitted codecs silently omit payload and decode none. `App.tsx` constructs `createAdminShellVueRouterNavigation` once and contains no generic cloning, history parsing, active restoration, request handling, route-specific payload branching, or reverse index. `admin-navigation.ts` separately owns exhaustive tab labels/closability and descriptor construction.
- **Base:** static local route pages with no data fetching, request models, or session restoration.
- **Bad:** a mock `login()` HTTP endpoint, a `SessionDto`, `localStorage` auth restoration, a router prop passed to `AdminShell`, a second preferences store, or importing admin source files directly.

## 6. Tests Required

- `pnpm --filter @noob-naive-ui/admin test` guards the public shell/login contract.
- `pnpm --filter demo typecheck` proves public declarations resolve from a clean state.
- `pnpm --filter demo build` proves the public admin stylesheet and app styles bundle.
- Browser assertions: whitespace rejection; non-empty login; menu route render; a page-owned button opens the non-menu detail route and exact tab; tab activation and close; sign out; theme/font/locale/sidebar controls; no console warnings/errors; no application API request.

## 7. Wrong vs Correct

```tsx
// Wrong: bypasses the library public boundary and makes CSS/tooling behavior diverge.
import { AdminShell } from "../../../packages/admin/src";

// Correct: consumes the declared runtime and explicit public stylesheet artifact.
import { AdminShell } from "@noob-naive-ui/admin";
import "@noob-naive-ui/admin/style.css";
```
