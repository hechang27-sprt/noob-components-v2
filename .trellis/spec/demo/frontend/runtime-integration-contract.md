# Runtime Integration Contract — Boundary Rules

> The **current** demo integration — exact callbacks, plugin options, route records, guard/scope behavior, and the host-owned vs package-owned split as it exists today — is documented in the code wiki at `openwiki/apps/demo.md`, `openwiki/packages/admin-vue-router/overview.md`, `openwiki/packages/admin-vue-router/plugin.md`, `openwiki/packages/admin-vue-router/navigation-runtime.md`, and `openwiki/packages/admin-vue-router/route-registry.md`. This spec sets only the rules to follow when changing it.

## 1. Scope / Trigger

Use this contract when changing `apps/demo` assembly, auth callbacks, route nesting, guards, or admin navigation. The demo is frontend-only: no backend transport, session persistence, DTOs, tokens, or fake API.

## 2. Contracts

- Import public package APIs and `@noob-naive-ui/admin/style.css`; never reach into package source.
- Package auth state is non-persistent Pinia state. Demo callbacks validate fake credentials and return presentation identity; they never set auth status.
- The host configures stores first, then installs Pinia on the app before the returned plugin. The plugin's `install` resolves the app Pinia via `getActivePinia()`.
- `App.tsx` owns shared providers plus the outer `RouterView`. It has no knowledge of login, shell, or auth status.
- `@noob-naive-ui/admin-vue-router.createAdminRouterPlugin()` owns generated admin route records, the auth guard, the scope guard, redirect validation, and auth-transition routing. The host does not write router guards.
- The host owns: Pinia instance, history mode (and base), route registry (definitions and codecs), tab presentation, page ID creation, navigation scope ID rotation, home destination, menu hierarchy, preference configuration, optional shell/login overrides, additional public routes, and scroll behavior.
- Menu is configured separately via `useAdminShellMenuStore().configure(createDemoMenu())`. The factory does not read menu state for route generation.
- Initialize `useAdminShellPreferencesStore` once; theme/font presentation consumes that same store.

## 3. Good, Base, and Bad Cases

- **Good:** relative registry children under factory-generated shell route; package-owned auth state and auth guard; host callbacks; factory-owned scope repair, redirect validation, and auth-transition routing.
- **Base:** backend-free in-memory login with static pages and no session restoration.
- **Bad:** root-local `Ref<AdminAuthStatus>`, auth props on shell/login, direct `_noobAdminShell` parsing in demo, absolute registry child paths, adapter-owned `/login`, persisted fake auth, or the host writing its own router guards or redirect validation.

## 4. Tests Required

- `pnpm --filter @noob-naive-ui/admin test`
- `pnpm --filter @noob-naive-ui/admin-vue-router test`
- `pnpm --filter demo typecheck`
- `pnpm --filter demo build`
- Browser: anonymous deep link, no shell on login, successful redirect restoration, authenticated shell, logout to login, safe redirect fallback, history-scope repair, no console warnings/errors, no application API request.

## 5. Wrong vs Correct

```ts
// Wrong: host parses package-private history, writes its own guard, manages auth status.
router.beforeEach((to) => {
  const shellState = router.options.history.state._noobAdminShell;
  if (!shellState?.scopeId) redirect("/login");
});
authStatus.value = { kind: "authenticated" };

// Correct: plugin owns routes, guards, redirect validation, scope repair.
// Host owns Pinia, history, registry, presentation, and scope identity, and
// installs Pinia before the plugin so its install resolves the app Pinia.
const adminRouter = createAdminRouterPlugin({
  history: createWebHistory(),
  registry: demoRouteRegistry,
  homeDestination: { navKey: "dashboard" },
  describeDestination: describeDemoDestination,
  createPageId: () => crypto.randomUUID(),
  getNavigationScopeId: () => navigationScopeId.value,
});
const app = createApp(App).use(pinia).use(adminRouter);
```
