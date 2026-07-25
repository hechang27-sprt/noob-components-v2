# Current Ownership Map: Host vs. Adapter

## Demo Host (`apps/demo/src`) — Currently Owns

| File | Responsibility | Movable? |
|------|---------------|----------|
| `main.ts:30` | `createPinia()` | No — app-level Pinia |
| `main.ts:32` | `createDemoRouter()` | **Yes** — router factory |
| `main.ts:34` | `navigationScopeId = ref(crypto.randomUUID())` | No — app decides scope identity |
| `main.ts:36` | `useAdminAuthStore(pinia)` | No — app needs store ref for configure |
| `main.ts:38` | `useAdminShellPreferencesStore(pinia)` | No — app initializes preferences |
| `main.ts:43-48` | `login()` / `logout()` callbacks | No — irreducibly host-owned |
| `main.ts:50` | `auth.configure({ login, logout })` | No — app wires its callbacks |
| `main.ts:52-60` | `preferences.initialize({ defaults })` | No — app decides defaults |
| `main.ts:63-70` | `createAdminShellVueRouterNavigation({...})` | **Partial** — 5 of 6 options could move |
| `main.ts:72` | `installDemoRouterGuards(router, pinia, navigation)` | **Yes** — guard installation |
| `main.ts:75-79` | `createApp(App).use(pinia).use(router).provide(navKey, nav).mount("#app")` | **Partial** — router/guard wiring |
| `main.ts:78` | `provide(demoNavigationKey, navigation)` | No — app provides |
| `router.ts:47-49` | `createDemoRouter()` with `createWebHistory()` + `demoRoutes` | **Yes** — could be adapter factory |
| `router.ts:33-37` | Login route record: `{ path: "/login", name: "login", component: DemoLoginRoute }` | **Partial** — login path could be default, component is host |
| `router.ts:38-43` | Shell route record: `{ path: "/", component: DemoShellRoute, meta: { requiresAuth: true }, children: registry.toRouteRecords() }` | **Partial** — structure is generic, meta/component are host |
| `router.ts:61-83` | `installDemoRouterGuards()` — auth guard | **Yes** — generic auth gating |
| `router.ts:82` | `navigation.installScopeGuard()` | Already adapter-owned |
| `demo-login-route.tsx` | `DemoLoginRoute` component | **Partial** — redirect resolution logic is generic; component wrapper is host |
| `demo-login-route.tsx:23-41` | `resolvePostLoginDestination()` | No — app owns protected route set + redirect URL validation |
| `demo-login-route.tsx:48-52` | `redirectAfterLogin()` → `enterScope()` | **Yes** — generic post-login scope entry |
| `demo-shell-route.tsx` | `DemoShellRoute` component | **Partial** — auth-status → navigate-to-login is generic; menu is host |
| `demo-shell-route.tsx:11-27` | `menuOptions` constant | No — irreducibly host-owned |
| `demo-shell-route.tsx:21-24` | Auth subscribe → `router.replace({ name: "login" })` | **Yes** — generic post-logout redirect |
| `route-registry.tsx` | `demoRouteRegistry` / `DemoNavKey` | No — irreducibly host-owned |
| `admin-navigation.ts` | `describeDemoDestination()` | No — irreducibly host-owned (labels, closable) |
| `navigation-context.ts` | `provide/inject` key | No — app wiring |
| `App.tsx` | Theme/font providers + outer `<RouterView />` | No — irreducibly host-owned |

## Adapter (`packages/admin-vue-router/src/index.ts`) — Currently Owns

| Feature | Status |
|---------|--------|
| `defineAdminRouteRegistry()` | Owned — registry binding, location conversion |
| `defineAdminRouteUrlCodec()` | Owned — Zod schema + encode/decode |
| `createAdminShellVueRouterNavigation()` | Owned — page-instance navigation |
| `toScopedLocation()` | Owned — stamps `_noobAdminShell` history state |
| `installScopeGuard()` | Owned — generic history-scope repair |
| `enterScope()` | Owned — explicit scope entry for post-login |
| `handleNavigation()` | Owned — open/activate/close through router |
| Router creation | **Not owned** — host creates router |
| Route records (`/login`, `/`) | **Not owned** — host owns route tree |
| Auth guard | **Not owned** — host installs guard |
| Auth state | **Not owned** — admin package store |

## Admin Core (`packages/admin/src`) — Currently Owns

| Feature | Status |
|---------|--------|
| `useAdminAuthStore()` | Owned — non-persistent Pinia auth state |
| `useAdminShellPreferencesStore()` | Owned — frontend preferences |
| `AdminLoginPage` | Owned — self-contained login form |
| `AdminShell` | Owned — authenticated-layout shell with tabs |
| Router API | **Never imported** — contract requirement |
