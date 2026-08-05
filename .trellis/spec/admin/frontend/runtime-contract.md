# Frontend Runtime Contract

## Package boundary

`packages/admin/src/runtime-contract.ts` is the contract boundary. It models only rendering-relevant frontend information.

- `AdminAuthStatus` is package-owned, non-persistent Pinia presentation state: loading, anonymous, or authenticated. Hosts configure effects but do not pass or set status props.
- `AdminAuthStoreConfig.login(values)` resolves `AdminAuthIdentity` (`userLabel?`, `avatarUrl?`, `subtitle?`); package actions transition status only after login/logout callbacks succeed.
- `AdminShellNavigation` is package-owned, non-persistent Pinia runtime input: hosts configure one router-neutral controller per Pinia, and `AdminShell` reads it without a component prop.
- `AdminMenuTree` is Naive UI `MenuOption[]`; it remains an existing public alias, while `AdminShell` accepts direct starter-built `MenuOption[]` without a visibility contract.
- `AdminShellPreferences` contains frontend-local shell settings.

Keep additions frontend-ready and minimal. The public barrel exports the auth/preferences stores, presentation types, `AdminLoginPage`, and `AdminShell`; add exports intentionally rather than reaching into internals.

## AdminShell page-instance navigation contract

`AdminShell` owns ephemeral page-instance membership, visible order, indexes, pending booleans, and close fallback. The host owns routing, destination interpretation, browser history identity, and confirmed active state, supplied once through `useAdminShellNavigationStore()`.

- `AdminShellDestination` contains only durable router-neutral data: `navKey` and optional `payload: Readonly<Record<string, unknown>>`. Callers must keep `payload` a plain JSON object; this is a documented contract rather than a recursive TypeScript constraint. `payload` is application navigation data, not Vue Router path parameters or a requirement to serialize directly into browser history.
- `AdminShellTabDescriptor.id` is immutable page-instance identity. Destinations are not identity: duplicate `navKey` and payload records are valid.
- `AdminShellTabDescriptor.label` is the shared `I18nText` discriminated union (`{ kind: "string"; value: string }` or `{ kind: "i18n"; key: string; named?: Record<string, string | number | boolean> }`) from `@noob-naive-ui/i18n`. `AdminShell` resolves `i18n`-kind labels against the host global Composer at render time, so tab titles follow locale switches; the adapter persists labels as I18nText via `i18nTextSchema`, so restored tabs re-render in the current locale. `named` values persist with history state and must stay JSON-serializable primitives. Tab descriptors crossing the adapter boundary must be plain data: reactive proxies cannot be `structuredClone`d (`DOMException: Proxy object could not be cloned`).
- `AdminShellTab` extends the public descriptor only inside the shell with `index`, `activationPending`, and `closePending`; these mutable fields never cross the host boundary.
- `AdminShellNavigation.handleNavigation` is the sole host callback. Its discriminated request variants are `open`, `activate`, `close`, and `heal`, and each carries destination-bearing snapshots. `heal` restamps the current browser-history entry in place with an exact committed descriptor: the shell requests it when history traversal revives a closed page instance whose destination already has a committed tab, and the adapter executes it only when the committed descriptor resolves to the same page as the current route.
- The host-authoritative `navigation.active` controls tab selection. The shell records confirmed descriptors by ID and never optimistically changes active state.
- Before opening, the optional second `navigate(destination, resolveTabNavigation?)` argument receives every public descriptor in visible order. Without that call-scoped resolver, the shell activates the newest matching `navKey`, ignoring payload, or opens when no match exists.
- `useAdminShell()` resolves the nearest mounted shell and returns one stable, command-only `AdminShellContext`; `navigate` uses that shell's existing destination-request path. Host-authoritative `navigation.active` remains internal shell input and is not re-exposed to descendants. The composable throws outside an `AdminShell`; the provider key stays private, and concurrent or nested shells remain isolated by Vue's hierarchical injection.
- An open candidate remains outside committed membership until the host returns the same confirmed ID. Rejection or stale completion cannot add it.
- Existing activation and close operations use exact tab-record identity and boolean pending fields. No session or pending-version counter owns committed operations.
- A plain menu key becomes `{ navKey: String(key) }`. Rich application triggers use either `useAdminShell().navigate(destination, resolveTabNavigation?)` or the compatible default scoped-slot control to supply payload and, separately, an optional resolution policy.
- Sidebar selection uses the active destination's `navKey`; unmatched keys naturally leave the opaque `MenuOption[]` unselected. There is no `menuKey` override.
- `AdminShell` is authenticated-layout-only when mounted; it reads package auth state for account presentation/logout and never renders login. `AdminLoginPage` independently reads the same store on the public login route.
- `@noob-naive-ui/admin` imports no router API. `@noob-naive-ui/admin-vue-router.createAdminRouterPlugin()` returns a Vue plugin installed after `app.use(pinia)`; its install resolves the app Pinia via `getActivePinia()` and owns generated admin route records, the auth guard, the scope guard, redirect validation, and auth-transition routing. The host owns Pinia, history mode, the route registry (definitions and codecs), tab presentation, scope ID generation, home destination, and menu configuration. Scope repair bypasses routes outside the bound registry; redirect restoration falls back to `homeDestination` for non-restorable targets.

### Required tests

`packages/admin/tests/admin-shell.test.tsx` covers authenticated layout, account/logout behavior, page-instance transitions, accessibility, menus, and preferences. `admin-login-page.test.ts` and auth-store tests cover package-owned status transitions and safe callback failures.

## Authentication restoration scenario

### 1. Scope / Trigger

When the host configures `useAdminAuthStore()`, the package must establish startup readiness before protected Vue Router navigation can resolve. Browser presentation identity is never authentication authority.

### 2. Signatures

```ts
type AdminAuthRestoreResult =
  | { kind: "authenticated"; identity: AdminAuthIdentity }
  | { kind: "anonymous" };

interface AdminAuthStoreConfig {
  restore: () => Promise<AdminAuthRestoreResult>;
}

waitForRestoration(): Promise<void>;
```

### 3. Contracts

- First `configure(...)` synchronously sets `{ kind: "loading" }` and invokes `restore` unconditionally; later configuration calls remain no-ops.
- Only a fresh authenticated restore result establishes authenticated presentation state. Anonymous or rejected restoration fails closed.
- `waitForRestoration()` settles on every restore outcome. The Vue Router auth guard awaits it while loading, then evaluates the original destination against current public auth status.
- Promise rejection remains observable to initiating login/logout callers, but Pinia stores only sanitized actionable presentation state. Never store arbitrary `Error` objects or expose raw host messages.
- Register a factory-owned `router.onError(...)` reporter for detached navigation effects, write failures to stderr with `console.error`, and unregister it during router disposal.

### 4. Validation & Error Matrix

| Outcome | Public state / effect |
| --- | --- |
| Authenticated restore | Fresh identity; requested protected navigation may continue |
| Ordinary anonymous restore | Ordinary login redirect with validated `redirectUrl` |
| Restore rejection before unavailable recovery exists | Fail closed and settle every waiter; ticket 03 owns recoverable unavailable UI |
| Login rejection | Safe generic `loginError`; original rejection remains observable to caller |
| Logout rejection | Ticket 04 owns local-first eviction and caller-visible cleanup rejection |
| Detached router navigation rejection | Report to stderr, contain the promise rejection, and permit later transitions |

### 5. Good / Base / Bad Cases

- Good: restoration authenticates, the guard releases, and the original protected destination resolves.
- Base: restoration returns anonymous, the guard releases to ordinary login without eviction messaging.
- Bad: restoration or scope entry rejects; readiness still settles, protected access stays closed, raw host errors do not enter shared UI, and later auth transitions remain possible.

### 6. Tests Required

- Store tests assert immediate loading, unconditional restore invocation, authenticated/anonymous outcomes, rejection settlement, concurrent waiters, and safe login failure state.
- Real Pinia plus memory-history tests assert pending protected navigation, post-restore reevaluation, validated anonymous redirect, no protected rendering before readiness, and later transition success after rejected scope entry.
- Navigation rejection tests assert `console.error` receives the original error and Vue Router does not emit its uncaught-navigation warning.

### 7. Wrong vs Correct

```ts
// Wrong: cached presentation data or an unresolved guard proves authentication.
if (cachedIdentity) return true;

// Correct: host restoration is authoritative and readiness precedes admission.
if (auth.status.kind === "loading") await auth.waitForRestoration();
return auth.status.kind === "authenticated";
```


## Host-owned authentication persistence

### Contract

- `AdminLoginValues.remember` is host input. The package forwards it unchanged; the host callback decides actual credential/session lifetime (cookie expiry, token duration, SDK session). Caching `AdminAuthIdentity` presentation fields does not implement Remember Me.
- `restore()` is parameterless. The host adapter inspects its own authority (HttpOnly cookie, bearer token, SDK session, server-preloaded state) and returns fresh `AdminAuthIdentity` or tagged anonymous result. The package stores no credential/session/identity in browser storage.
- The package owns reusable auth orchestration — loading/readiness, fresh presentation state, tagged anonymous causes, operation-generation ownership, and safe callback ordering. It exposes no persistence namespace, storage adapter, identity codec, tier selector, or cross-tab event transport.
- Cross-tab session-change delivery is host-owned (SDK events, BroadcastChannel, server push, or another mechanism). The host invokes one idempotent package local-invalidation action per affected tab. The package never rebroadcasts, deduplicates, or owns event schemas.
- The core seam supports HttpOnly-cookie, bearer-token, SDK, SSR/preloaded, and in-memory test hosts without selecting a persistence mechanism for them.

### Mechanism-neutral host examples

- **HttpOnly cookie:** login endpoint sets cookie lifetime per `remember`. Restore calls `/session`. Logout clears/revokes the cookie.
- **Bearer token:** host `login` stores the token and refresh logic. Restore validates the stored token. Logout deletes it.
- **SDK:** callbacks delegate to SDK session operations. No package storage required.
- **SSR/preloaded:** restore reads preloaded server state. Login/logout perform full-page navigation or write server-session cookies.
- **Test/in-memory:** callbacks return fixed identity or anonymous; no storage, no namespace.

### Validation

| Condition | Required behavior |
| --- | --- |
| Host restore succeeds | Fresh presentation identity; package enters `authenticated` |
| Host restore returns anonymous | Package enters `anonymous`; no storage consulted |
| Host restore rejects | Fail closed; package settles readiness and enters `anonymous` |
| Login `remember: true` | Forwarded to host; host owns actual lifetime |
| Manually seeded legacy identity records | Inert; no runtime reads or validates them |

## Required separation

The admin package must not import or define backend routes, request/response DTOs, transport clients, session/user models, permission payloads, TanStack Query ownership, or packaged business CRUD pages. The [shell/router/host ownership decision](../../../../docs/adr/0001-separate-shell-router-and-host-ownership.md) assigns those responsibilities to the host application.

The host application derives the final `MenuOption[]`, including visibility and hierarchy, and maps confirmed route state into `AdminShellNavigation.active`. It configures router-neutral menu/navigation stores once per Pinia; the Admin shell renders menu structure unchanged, requests string-keyed navigation, and must not filter visibility, normalize keys, receive route objects, or receive a router.

## Dependencies and build

`packages/admin/package.json` declares Vue, Vue I18n, Pinia, Naive UI, and Pro Naive UI as peers; `@noob-naive-ui/ui`, `@vicons/ionicons5`, and Zod are implementation dependencies. Follow the shared workspace dependency policy: ecosystem-wide runtime versions use `catalog:`, and the workspace root owns the Vue I18n build plugin. `packages/admin/vite.config.ts` builds `src/index.ts` as an ES library with Vue JSX and Tailwind plugins, and externalizes every runtime import: those three implementation dependencies plus the five peers. Preserve this boundary when adding imports or build features.

Avoid broad Naive/Pro Naive re-exports. Import and compose primitives directly inside admin package components, as `packages/admin/src/components/admin-login-page.tsx` and `packages/admin/src/components/admin-shell.tsx` do.

## Verification

Type-check and build after public-contract changes. Tests must cover callback success/rejection, internal status transitions, standalone login, authenticated shell rendering, one-time/reactive navigation-store behavior, and unchanged page-instance behavior.
