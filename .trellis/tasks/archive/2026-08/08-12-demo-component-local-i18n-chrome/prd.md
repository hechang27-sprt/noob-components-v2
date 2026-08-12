# AdminProvider + provider-seeded demo locale architecture

## Goal

Deliver the converged demo host architecture: an **admin-package `AdminProvider`** component (props-driven,
naive-ui-shaped root provider supplying locale, theme, and mount-safe presentational config), the
**demo adopting it** (provider-seeded global locale; pages keep reading `i18n.global`), and the
**regex-based locale HMR injection removed** in favor of component self-accept + `handleHotUpdate`
redirect (validated).

## Background (recorded 2026-08-12; full trail in `research/chrome-message-architecture.md`)

- `createWorkspaceLocaleHmrPlugin.transform` previously injected a regex-based
  `import.meta.hot.accept` block into plain-module locale aggregators because `demo.json` was
  imported+wired at app setup in `i18n.ts` (plain module → no self-accept → full reload).
- **Validated (browser):** importing + wiring the locale resource inside a component
  (`LocaleProvider`) makes edits HMR in place via component self-accept + `handleHotUpdate`
  virtual-module redirect — no injection needed. `transform` simplified to recording-only; the
  injection and `COMPOSER_DECL_PATTERN` are removed.
- Chrome keys (`nav`/`tabs`/`login`) are consumed by non-component modules and pre-mount code, but
  the reads are lazy (render/run-time, after mount) — so a provider seeding the global Composer
  before children render satisfies them with no consumer changes.

## Requirements

- **R1 (AdminProvider):** `packages/admin` exports a props-driven `AdminProvider` (`defineComponent`)
  that seeds the host global Composer from a `messages` prop (watch-immediate + on prop change),
  configures `menu.configure` + `preferences.initialize` once, and renders `NConfigProvider`
  (theme) around its slot.
- **R2 (Demo adoption):** `App.tsx` imports `demo.json` (component scope) and passes
  `messages`/`menu`/`preferences`/`theme` to `AdminProvider`; `main.ts` keeps only
  `auth.configure` + `createAdminRouterPlugin`; the spike `LocaleProvider` is deleted; pages keep
  reading `i18n.global`.
- **R3 (Injection removal):** `createWorkspaceLocaleHmrPlugin.transform` stays recording-only;
  no regex injection, no app-side `import.meta.hot.accept`.
- **R4 (Docs):** `library-i18n-contract.md` gains the "import locale resources in a component
  (`AdminProvider`)" convention; stale skill note flagged.

## Acceptance criteria

- [ ] `AdminProvider` exported from `packages/admin`; unit test proves global-Composer seeding on
      mount AND on `messages` prop change, once-only menu/preferences config, and `NConfigProvider`
      rendering.
- [ ] Demo runs via `AdminProvider`; `apps/demo/src/locale-provider.tsx` removed; `main.ts` contains
      no `menu.configure`/`preferences.initialize`.
- [ ] Browser (methodology per `noob-demo-browser-verification-setup`): edit `demo.json` →
      `(client) hmr update` bounded at the importing component (no `page reload`); beforeunload
      counter stays 0; heading text updates in place.
- [ ] `pnpm --filter admin typecheck`, `pnpm --filter admin test`, `pnpm --filter demo typecheck`,
      `pnpm --filter demo build` pass.
- [ ] `library-i18n-contract.md` updated.

## Out of scope

- Provide/inject migration of menu/auth/navigation (deferred; stays Pinia-store-based).
- Navigation decoupling from `admin-vue-router` via a public provide/inject key (deferred).
- Pages → component-local i18n split (superseded by provider-seeded global).
- Moving `auth.configure` / `createAdminRouterPlugin` into a provider (impossible — auth guard
  fires at router install, before mount).

## Key decisions

1. **(a)** Ergonomic host-side consolidation; Pinia stores for menu/auth/nav; navigation stays a plugin.
2. **(i)** Provider owns mount-safe presentational config (`menu`, `preferences`) + context
   (locale, theme).
3. **(A)** Provider-seeded global is the final architecture; pages read `i18n.global`.
4. Provider is part of the **admin package**.
5. **(i)** Props-driven `AdminProvider` contract (`messages`/`menu`/`preferences`/`theme`).
6. **Consumption contract: `useAdminProvider()` composable over the Pinia stores** (tabs pattern:
   `useAdminShellTabs` over `useAdminShellTabsStore`). State stays in the stores (implementation
   detail — SSR/HMR-safe); the composable exposes a curated surface and is the public API. No
   provide/inject; no `useAdminProvider` requiring the provider to be mounted.

## Risks / deferred

- `messages` untyped at the package boundary (host message shape arbitrary) — accepted trade-off.
- HMR remounts re-run `preferences.initialize`/`menu.configure` — once-guarded, idempotent.
- Stale `noob-workspace-locale-hmr-boundaries` skill (user-authored; cannot edit — flag for replacement).

## Artifacts

- `design.md` (architecture, contract, HMR mechanics, migration)
- `implement.md` (ordered checklist, validation, risky files)
- `research/chrome-message-architecture.md` (findings, decisions, validated proof)
