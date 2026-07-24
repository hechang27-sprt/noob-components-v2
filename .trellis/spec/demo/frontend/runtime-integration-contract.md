# Runtime Integration Contract

## 1. Scope / Trigger

Use this contract when changing `apps/demo` assembly, auth callbacks, route nesting, guards, or admin navigation. The demo is frontend-only: no backend transport, session persistence, DTOs, tokens, or fake API.

## 2. Signatures

```ts
const auth = useAdminAuthStore(pinia);
auth.configure({
  login(values): Promise<AdminAuthIdentity>,
  logout(): Promise<void> | void,
});

const navigation = createAdminShellVueRouterNavigation({
  router,
  registry: demoRouteRegistry,
  describeDestination,
  createPageId,
  getNavigationScopeId,
  homeDestination: { navKey: "dashboard" },
});

navigation.installScopeGuard();
await navigation.enterScope(destination);
```

Registry route paths are relative children (`""`, `"reports"`, `"detail/:reportId"`). The host wraps them beneath the shell layout and keeps `/login` as a public sibling.

## 3. Contracts

- Import public package APIs and `@noob-naive-ui/admin/style.css`; never reach into package source.
- Package auth state is non-persistent Pinia state. Demo callbacks validate fake credentials and return presentation identity; they never set auth status.
- `App.tsx` owns shared providers plus the outer `RouterView`. `DemoLoginRoute` renders `AdminLoginPage`; `DemoShellRoute` renders `AdminShell` plus an inner `RouterView`.
- The host auth guard runs before adapter scope repair. Anonymous protected routes redirect to `/login?redirectUrl=<fullPath>`; authenticated `/login` redirects home.
- Redirect restoration accepts only a root-relative URL resolving to a matched protected registry route. Login, external, malformed, and public targets fall back to Dashboard.
- `@noob-naive-ui/admin-vue-router` parses `_noobAdminShell`, bypasses non-registry routes, repairs stale/missing protected scope to one stable home descriptor per scope, and stamps explicit post-login entries through `enterScope`.
- The host owns route tree, login path, auth callbacks, scope ID rotation, redirect validation, menus, codecs, and tab presentation. The adapter owns no auth state.
- Initialize `useAdminShellPreferencesStore` once; theme/font presentation consumes that same store.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Empty trimmed username/password | Callback rejects; package stays anonymous and shows generic feedback. |
| Valid credentials | Callback returns `AdminAuthIdentity`; package becomes authenticated; route restores a safe target. |
| Anonymous protected deep link | Redirect to standalone login with encoded original full path. |
| External, login, malformed, or unmatched redirect | Enter a scoped Dashboard route. |
| Current-scope protected history | Proceed unchanged. |
| Stale/missing protected scope | Adapter replaces with scoped Dashboard. |
| `/login` or unrelated route | Scope guard bypasses it. |
| Successful logout | Package becomes anonymous; host shell route replaces to `/login`. |

## 5. Good, Base, and Bad Cases

- **Good:** relative registry leaves nested under host shell route; package-owned auth state; host callbacks; one shared adapter; adapter-owned scope repair.
- **Base:** backend-free in-memory login with static pages and no session restoration.
- **Bad:** root-local `Ref<AdminAuthStatus>`, auth props on shell/login, direct `_noobAdminShell` parsing in demo, absolute registry child paths, adapter-owned `/login`, or persisted fake auth.

## 6. Tests Required

- `pnpm --filter @noob-naive-ui/admin test`
- `pnpm --filter @noob-naive-ui/admin-vue-router test`
- `pnpm --filter demo typecheck`
- `pnpm --filter demo build`
- Browser: anonymous deep link, no shell on login, successful redirect restoration, authenticated shell, logout to login, safe redirect fallback, history-scope repair, no console warnings/errors, no application API request.

## 7. Wrong vs Correct

```ts
// Wrong: host parses package-private history and mutates auth state.
router.beforeEach(() => router.options.history.state._noobAdminShell);
authStatus.value = { kind: "authenticated" };

// Correct: package action owns status; adapter owns generic scope metadata.
auth.configure({ login, logout });
navigation.installScopeGuard();
await navigation.enterScope({ navKey: "dashboard" });
```
