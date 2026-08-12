---
type: app
title: apps/demo — Backend-Free Host Application
description: "The reference host application proving the full admin stack: Pinia plus auth effects plus preferences plus menu assembly, the admin router plugin, registry codecs, tab presentation policy, and demo pages."
tags: [app, demo, host, integration]
---

# apps/demo — Backend-Free Host Application

`apps/demo` is the **reference host application** for the workspace: a
backend-free, session-simulating consumer that exercises every shared package
together. It is an example host, not an additional architecture owner or a source
of shared-package policy (ADR-0002 calls it out explicitly). Run it with
`pnpm --filter demo dev` (Vite dev server); `pnpm --filter demo build` and
`pnpm --filter demo typecheck` validate it.

Dependencies: `@noob-naive-ui/admin`, `@noob-naive-ui/admin-vue-router`,
`@noob-naive-ui/i18n`, `@noob-naive-ui/prototype-i18n-verification`, plus
`naive-ui`, `pinia`, `pro-naive-ui`, `vue`, `vue-i18n`, `vue-router`, `zod`.

## Assembly order (`src/main.ts`)

The file is a precise tutorial in host responsibilities:

1. `createPinia()` before any public store resolves; `useAdminAuthStore(pinia)`
   resolves against it.
2. **Navigation scope**: `navigationScopeId = ref(crypto.randomUUID())` — the
   demo's host-owned history-isolation epoch, **rotated on every login** (and
   inside `login`), demonstrating that a scope is not a session credential.
3. **Auth effects**: `login(values)` validates non-empty credentials, writes the
   fake session (`demoSessionKey` = `"noob-components-v2:demo:session"`) into
   `localStorage` (remember) or `sessionStorage` (tab-scoped), removes the
   opposite tier, rotates the scope, and returns presentation identity
   `{ userLabel: username }`; `restore()` reads either storage tier; `logout()`
   clears both. The store owns state transitions — the host never mutates auth
   status directly.
4. `auth.configure({ login, logout, restore })` — configure before router
   creation.
5. `createAdminRouterPlugin({ history: createWebHistory(), registry:
   demoRouteRegistry, homeDestination: { navKey: "dashboard" },
   describeDestination: describeDemoDestination, createPageId: () =>
   crypto.randomUUID(), getNavigationScopeId: () => navigationScopeId.value })`.
6. `createApp(App).use(pinia).use(i18n).use(adminRouter)` — plugin **after**
   Pinia; install binds stores and registers the router.
7. Append the `naive-ui-style` meta element (naive-ui CSS injection contract)
   and `app.mount("#app")`.

`main.ts` deliberately stops at auth, the router plugin, and mount: preference
initialization, menu configuration, global-Composer seeding, and i18n message
seeding moved into the `AdminProvider` component mounted by `App.tsx` — see
[Root Provider](../packages/admin/provider.md).

## Presentation root (`src/App.tsx`)

`DemoApp` mounts the package-owned **`AdminProvider`** as the root provider
(which renders the `NConfigProvider` internally) around `RouterView`, supplying:

- `messages={demoMessages}` — the per-locale demo resources
  (`src/locales/demo.json`), seeded into the host global Composer by the
  provider at setup and re-seeded on prop change (the HMR path);
- `menu={createDemoMenu()}` — the demo menu hierarchy (`dashboard`;
  `demo → internationalization`; `workspace → reports, settings`) with
  **reactive locale labels** (`label: () => i18n.global.t(labelKey)`) and
  nav-key identity; built in `App.tsx` by `createMenuOption`;
- `storeOptions={{ defaults: { availableLocales: [...] }, fallbackLocale: "en" }}`
  — preference defaults and host-owned naive-ui fallback locale;
- `overrides={{ en: { AdminShell: { account: { signOut: "Log out" } } },
  "zh-CN": { AdminShell: { account: { signOut: "退出" } } } }}` — the package
  text-override snapshot (the component-based replacement for the former
  `app.use(adminI18nPlugin, { messages })` install).

The host component still owns the browser-level wiring that the provider does
not:

- tracks the browser `prefers-color-scheme` media query and mirrors it into the
  runtime-only store signal via `provider.setSystemUsesDark` (listener removed
  on unmount);
- applies the preference base font to the root element via
  `resolveAdminNaiveBaseFontSize(provider.fontSize.value)` so `rem`-based
  content scales with the font-size preference (naive-ui cannot scale plain HTML
  itself);
- binds nothing else — no auth, routes, or shell navigation ownership.

## Routes and destination policy (`src/routes.ts`)

`demoRouteRegistry = defineAdminRouteRegistry({...})` registers five nav keys:

- `dashboard` (path `""`, non-closable home tab),
- `internationalization` (path `demo/internationalization`),
- `reports` (path `reports`),
- `settings` (path `settings`),
- `detail` (path `detail/:reportId`) with a **payload codec**
  (`defineAdminRouteUrlCodec`): `detailPayloadSchema = z.object({ reportId:
  z.string().min(1) })`; `encode` maps payload → `params.reportId`; `decode`
  reconstructs raw payload from the URL param.

`describeDemoDestination(id, destination)` maps each nav key to tab
presentation: i18n-kind labels resolved against the global Composer (so open and
restored tabs follow locale switches reactively), `dashboard` fixed
`closable: false`, `detail` labels carry `named: { id: reportId }`; unknown keys
throw. `DemoNavKey = (typeof demoRouteRegistry.navKeys)[number]` keeps menu and
registry aligned.

## Demo pages (`src/pages/demo/`)

- `dashboard-demo-page.tsx` — non-closable home (text via global Composer).
- `internationalization-demo-page.tsx` — renders `PrototypeCard` from
  `@noob-naive-ui/prototype-i18n-verification` and exposes verification data
  attributes `data-demo-preference-locale` (read through
  `useAdminProvider().locale`) / `data-demo-global-locale`.
- `reports-demo-page.tsx` — uses `useAdminShell()`'s `navigate` with a
  **call-specific resolver** `() => ({ kind: "open" })` so each click opens a new
  detail instance even when a detail tab is already open.
- `detail-demo-page.tsx` — receives `reportId` via `props: true` route projection.
- `settings-demo-page.tsx` — points at the shell's preference controls.

## i18n (`src/i18n.ts`)

Single Composition-API global instance: `createI18n({ legacy: false, locale:
"en", fallbackLocale: "en" })` — created **without** messages. `AdminProvider`
seeds the per-locale resources into this Composer at setup time (not at app
setup), so locale-resource edits HMR through the provider's component
self-accept boundary instead of a plain-module full reload. The host owns the
active locale and fallback locale; AdminShell owns all later store → Composer
synchronization; non-component modules (menu, tab labels) translate through
`i18n.global.t` after the provider has mounted. See
[Root Provider](../packages/admin/provider.md).

## Vite entry

`index.html` is the standard Vite entry (`<div id="app">` +
`<script type="module" src="/src/main.ts">`); `app.mount("#app")` in `main.ts`
targets it. `tsconfig.json` extends the workspace typecheck (strict,
`jsxImportSource: vue`).

## Vite config

`apps/demo/vite.config.ts` wires the workspace preset
(`createWorkspaceVueI18nPlugin`), the admin locale-type watcher plugin, and
`resolve.alias` entries mapping every `@noob-naive-ui/*` package name (including
the `style.css` subpaths) to its **source** entrypoint, so the dev server and
typechecks consume TypeScript directly.

## Related

- [Ownership Contract](../architecture/ownership-contract.md) — the host role
- [Admin root provider](../packages/admin/provider.md) — the component that owns
  the demo's preferences/menu/message/override wiring
- [Admin router plugin](../packages/admin-vue-router/plugin.md) — the plugin the
  demo installs
- [Route registry](../packages/admin-vue-router/route-registry.md) — demo codec
  usage
- [Admin shell](../packages/admin/shell.md) — navigate/activate/close from pages
