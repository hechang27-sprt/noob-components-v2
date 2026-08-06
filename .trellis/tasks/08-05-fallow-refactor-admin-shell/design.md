# Design — fallow triage + AdminShell refactor

## 1. Fallow finding taxonomy

Each report item classed as **FIX** or **FALSE-POSITIVE (leave)**.

### FIX (genuine dead code)

| Finding | Location | Action |
|---|---|---|
| Unused dep `tsafe` | `packages/admin/package.json` | Remove from `dependencies`. Only `packages/i18n` and `packages/prototype-i18n-verification` import tsafe; confirm both still list it. |

### KEEP (documented public API — fallow false positive)

| Finding | Location | Why it must stay |
|---|---|---|
| Unused export `DEFAULT_SNAPSHOT` | `packages/admin/src/i18n/plugin.ts:36` | `.trellis/spec/ui/frontend/library-i18n-contract.md:51` documents `DEFAULT_SNAPSHOT` as a public alias consuming packages re-export. Removing it breaks the spec contract. |
| Unused store members `replacePreferences`, `reset` | `packages/admin/src/stores/shell-preferences.ts` | `useAdminShellPreferencesStore` is re-exported from `index.ts:19`; these are public store actions a host may call. fallow's "unused store members" is a false positive for a published library store. |

### FALSE-POSITIVE (do NOT change)

| Finding | Why it's a false positive |
|---|---|
| `tooling/vite/vue-i18n.ts` "unused file" | Imported by `apps/demo/vite.config.ts:7`. Vite configs are not fallow entry points. |
| `noobUiI18n` "unused export" | `packages/ui/src/i18n/plugin.ts:27` — consumed at line 45 as `noobUiI18n.plugin` → `noobUiI18nPlugin` (re-exported in `index.ts:9`). |
| `tailwindcss/theme.css`, `tailwindcss/utilities.css` unresolved | Tailwind v4 CSS-first imports; need the Tailwind fallow plugin. |
| 5 "unlisted deps" (`@intlify/unplugin-vue-i18n`, `@tailwindcss/vite`, `@vitejs/plugin-vue-jsx`, `unplugin-dts`, `vite-plugin-vue-devtools`) | Declared at repo-root `package.json`, consumed in package vite configs. Monorepo root-devDep pattern; fallow scans per package. |
| 2 duplicate clone groups in `locale-types.generated.ts` | Generated file (from `tooling/vite/json-locale-types.ts` via `packages/admin/vite.config.ts` plugin). Never hand-edit; the JSON→TS shape legitimately repeats message-key accessor shapes. |

### devDependencies "unused"

`@typescript/typescript6` and `npm-run-run-all-next` in root `package.json` — verify each is truly unreferenced before touching; these predate this branch (root config) and are out of the review surface's intent. **Do not remove in this task** unless confirmed unused AND clearly ours to delete; otherwise record as out-of-scope.

## 2. AdminShell refactor shape

Current `AdminShell` (871 LOC) mixes three responsibilities. Split into behavior-identical units.

> **Follow-up (user review):** the initial split passed too much state via tiny callback props into the "pseudo-component" slot renderers, and the i18n package API has naming/contract issues. This section now incorporates that rework (§2e-2h). §2a-2c describe the landed baseline; §2e+ is the rework.

### 2a. Extract tab-navigation composable (primary)

New file `packages/admin/src/components/use-admin-shell-tabs.ts` (follows the existing `use-*` naming in `packages/i18n`).

**Composable:** `useAdminShellTabs(options: { getNavigation: () => AdminShellNavigation | null; t: (key: string, named?: Record<string, unknown>) => string })`

Owns (moved verbatim from `AdminShell` setup):
- State: `tabs` Map, `visibleTabs` ref, `knownPageIds`, `pendingOpen` shallowRef, `tabError` ref, `healingRevives`.
- Functions: `reindexTabs`, `clearTabs`, `recordCurrentTab`, `openedDescriptors`, `newestCommittedFor`, `recordOrHealActive`, `canActivateTab`, `activateTab`, `requestDestination`, `getCloseDestination`, `closeTab`.
- The `watch` (immediate+sync) that clears/records tabs on navigation change, and `onBeforeUnmount(clearTabs)`.
- `t` is passed in for error feedback (`t("errors.unableToNavigate")`, `t("errors.unableToCloseTab")`).

**Returns:** `{ tabs, visibleTabs, pendingOpen, tabError, canActivateTab, activateTab, closeTab, requestDestination, clearTabs }` (refs kept reactive for render; `tabs` used by render's tabbar map).

`AdminShell` then calls `useAdminShellTabs({ getNavigation: () => nav.navigation, t })` and drops all moved code + its own `watch`/`onBeforeUnmount`. `requestDestination` (CRAP 71.3) and `closeTab` (49.5) move out of the component.

### 2e. `useAdminShell` becomes the public tabs controller (rework)

The user's directive: expose the **entire** result of `useAdminShellTabs` through `useAdminShell`, so descendants (the tabbar, page components) get the controller without individual callback props. `useAdminShellTabs` stays an internal implementation detail of `AdminShell`; `useAdminShell` is the public controller surface.

- `AdminShellContext` widens from `{ navigate }` to the full controller:
  ```ts
  type AdminShellContext = {
    navigate: AdminShellNavigate;                      // requestDestination
    tabs: ReadonlyMap<string, AdminShellTab>;
    visibleTabs: Ref<string[]>;
    tabError: Ref<string | undefined>;
    canActivateTab: (id) => boolean;
    activateTab: (id) => Promise<void>;
    closeTab: (id) => Promise<void>;
  };
  ```
  `useAdminShellTabs` builds this full context, calls `provide(adminShellContextKey, context)`, and returns it — so `AdminShell` receives the ready controller with no destructure-and-reassemble round trip.
- `useAdminShellTabs` is NOT exported from `packages/admin/src/index.ts` (internal module). `useAdminShell` and `AdminShellContext` remain public exports.
- **Spec/contract impact:** `.trellis/spec/admin/frontend/runtime-contract.md` currently says `useAdminShell()` returns "one stable, command-only AdminShellContext". Update it to describe the controller surface and that `navigation.active` (host-authoritative) is still NOT exposed — only shell-owned tab state.
- **Test impact:** `packages/admin/tests/admin-shell.test.tsx` `ShellContextConsumer` asserts `Object.keys(shell)` equals `"navigate"` (lines ~40, 447-450). Update to the new key set (sorted). The `data-shell-navigate` button still works.

### 2f. i18n package API rework (rework)

Per user review, three i18n package changes in `packages/i18n`:

1. **Rename `useComponentI18n` → `createComponentI18n`** (signal it is NOT idempotent — it creates a fresh local Composer each call). Update `src/use-component-i18n.ts`, `src/index.ts` export, and all callers.
2. **`createComponentI18n` provides the composer and returns just it.** Inside, after building the local Composer, call `provide(componentI18nKey, composer)`. Return type narrows to `Composer` (destructurable) — drop the `{ composer, t, locale }` wrapper return. Add a new public `getComponentI18n(): Composer` that `inject(componentI18nKey)`s the nearest ancestor composer and throws if none.
   - New injection key `componentI18nKey: InjectionKey<Composer>` (module-private in `packages/i18n`).
3. **Fix `resolveI18nText` doc + usage.** The `translate` parameter's doc must say it is vue-i18n's `t` passed directly (e.g. `resolveI18nText(label, composer.t)`), not a bespoke wrapper. Update `packages/i18n/src/i18n-text.ts` doc comment. Fix AdminShell's redundant wrapper:
   ```ts
   // WRONG
   resolveI18nText(label, (key, named) => named ? globalComposer.t(key, named) : globalComposer.t(key))
   // RIGHT
   resolveI18nText(label, globalComposer.t)
   ```
   (`t` already handles `named === undefined`.)

Callers to update: `packages/admin/src/components/admin-shell.tsx`, `admin-login-page.tsx`; tests `packages/i18n/tests/use-component-i18n.test.tsx`; spec `.trellis/spec/ui/frontend/library-i18n-contract.md`.

### 2g. Sub-components become self-sufficient (rework)

Per user directive, the slot "pseudo-components" must stop receiving dozens of tiny callback/data props. Each fetches its own stores and i18n:

- **Pinia stores** → call `useAdminShellPreferencesStore()`, `useAdminAuthStore()`, `useAdminShellNavigationStore()` directly inside the sub-component (no store data props).
- **Admin-package i18n text** (aria labels, `tabs.openPages`, errors, account/signedIn text) → `const { t } = getComponentI18n()` (nearest provided local composer). Little-to-no text stays passed as a translated string prop only where genuinely tiny.
- **Tab state/actions** → `const shell = useAdminShell()` (full controller from §2e).
- **Host tab labels** (`tabs.dashboard`, `tabs.detail`) → resolved through the SAME local Composer via `getComponentI18n().t`. With `fallbackRoot: true` (see §2i), a key absent from the package registry falls through to the host-global Composer, so `resolveI18nText(tab.label, t)` renders host-authored labels without a second `useI18n({ useScope: "global" })` lookup.

### 2h. Sub-component FORM: plain functional components, not defineComponent (rework)

Per user review, the slot renderers are pure-presentational and must be **plain Vue functional components** — `export function AdminShellTabbar(): VNode { ... return (<jsx/>) }` returning JSX **directly** (NOT a render closure, and NOT `defineComponent`). The user distinguished these from `defineComponent`'s first-arg setup function, which returns `() => <jsx/>`. They render as descendants mounted in ProLayout slots (`nav-left: () => <AdminShellNavLeft />`), so their composition calls (`getComponentI18n`, `useAdminShell`, `useI18n`, stores) resolve against AdminShell's context.

- `AdminShellTabbar` / `AdminShellNavLeft` / `AdminShellNavRight` are plain functions returning `VNode` (`JSX.Element` is unavailable in this Vue+TS setup; `VNode` is the correct return type).
- **Why not plain `useI18n()` in the child (user's food-for-thought):** empirically disproven — a functional child's plain `useI18n()` creates a fresh empty local Composer that does NOT inherit the parent's locally-merged package messages (`createComponentI18n` merges `AdminShell.json` defaults + overrides into its local Composer). So `getComponentI18n()` (the provide/inject accessor) remains necessary for admin-package text; plain `useI18n()` only serves host-global labels.

**Critical Vue quirk (test pollution):** a `defineComponent` whose setup throws leaves Vue's render-scoped instance global stale for EVERY subsequent functional-component render in the same suite (functional components resolve `inject` against that global). The `defineComponent`-with-setup form was immune (inject ran in setup, not render). In production this never happens (no failed mounts), but in tests the "throws when descendant context is requested outside AdminShell" test corrupts all following tests. **Fix: run the throwing-mount test LAST in the `AdminShell` describe block** (the `packages/i18n` suite already does exactly this — its throws test is last). Do not "fix" production code for this test artifact.

**Critical mechanical constraint:** the slot renderers currently run in AdminShell's **render** function, so they cannot call composition functions (`getComponentI18n`, `useAdminShell`, `useI18n`, `useXXXStore`). Rework so each sub-component is a **real component** rendered in the ProLayout slot (e.g. `tabbar: () => <AdminShellTabbar />`, `nav-right: () => <AdminShellNavbarControls />`), giving it its own setup context. Navbar left/right are two slots — decide: either one `AdminShellNavbarControls` component wrapping both (via a fragment/children) or render it once per slot. Keep it simple: render the same component instance content in both slots via two slot functions that mount it (or split into `AdminShellNavLeft` / `AdminShellNavRight` if cleaner).

- **`AdminShellTabbar`**: props reduce to none (or only non-i18n structural data). Reads `useAdminShell()` for `tabs`/`visibleTabs`/`tabError`/`canActivateTab`/`activateTab`/`closeTab`; `getComponentI18n().t` for the `tabs.openPages` aria label AND host tab labels via `resolveI18nText(label, t)` (single composer, `fallbackRoot: true` — §2i). `activeId` from `useAdminShellNavigationStore().navigation?.active?.id`.
- **`AdminShellNavbarControls`**: reads `useAdminShellPreferencesStore()`, `useAdminAuthStore()`, `getComponentI18n().t` for all its labels/aria; calls store actions directly (`setThemeMode`, `setFontSize`, `setLocale`, `setSidebarCollapsed`, `logout`). No handler props.

### 2i. `fallbackRoot: true` — host keys resolve through the local Composer (user decision)

The user approved flipping `createComponentI18n`'s `fallbackRoot` from `false` to `true`:

- **Behavior (empirically verified):** with `fallbackRoot: true`, the local Composer that `getComponentI18n()` returns resolves BOTH package-owned keys (`pkg.own` → `PKG-OWN`) and host-global keys absent from the package registry (`tabs.dashboard` → host value). With `false`, host keys return the raw key.
- **Consequence:** the tabbar needs only ONE translator — `getComponentI18n().t` — for its own aria text AND host tab labels. The prior `useI18n({ useScope: "global" })` dual-composer pattern is removed.
- **Tradeoff accepted:** a missing/typo'd *package* key now silently falls through to the host-global registry instead of surfacing as a raw key. This is a minor isolation loss; host-authored content (tab labels) is the common, intended case.
- **Spec:** `.trellis/spec/ui/frontend/library-i18n-contract.md` updated (signatures, contract bullet, Vue 11.4.8 correction note → `composer.fallbackRoot = true`).
- **Tests:** `packages/i18n/tests/use-component-i18n.test.tsx` updated to assert `fallbackRoot === "true"` and to prove a host-authored key resolves through the package Composer (via a seeded host-global registry).

### 2c. What stays in `AdminShell`

- Store reads (`auth`, `preferences`, `menu`, `nav`) — still needed for `default` slot composition and top-level layout wiring.
- `createComponentI18n` (renamed) + `useGlobalI18nSync`.
- Header handlers that are pure store passthroughs may move into the sub-components; keep in AdminShell only what must stay for the layout.
- `shellContext` + `provide` + `useAdminShell` (now the full controller).
- The `default` slot.
- Assembling `layoutSlots` (mounting the sub-components into slots).

### 2d. Public API / tests

- `AdminShell`'s public type exports (`AdminShellTab`, `AdminShellDestination`, `AdminShellNavigation*`, `useAdminShell`, `AdminShellContext`, etc.) stay exported from `index.ts`; `AdminShellContext` SHAPE changes per §2e (doc comments updated). `useAdminShellTabs` is internal (not exported).
- `packages/admin/tests/admin-shell.test.tsx` — update the `ShellContextConsumer` context-key assertion; all behavior tests must still pass. `packages/admin/tests/shell-preferences.test.ts` unchanged.
- `packages/i18n/tests/use-component-i18n.test.tsx` — rename usage + adapt to `createComponentI18n` returning a composer and `getComponentI18n` retrieval; add a `getComponentI18n` throws-without-ancestor case.
- `packages/i18n/tests/i18n-text.test.ts` — update `resolveI18nText` doc-affected expectations if the signature changes (should NOT — behavior identical, only docs + caller usage).

## 3. Verification commands

- `pnpm install` after dependency edits (admin `tsafe` removal) — clean.
- `pnpm -r exec tsc --noEmit` scoped to touched packages (`admin`, `i18n`, `ui`, `prototype-i18n-verification`, `admin-vue-router`) — per `source-based-workspace-verification` conventions, source typecheck without prebuilt deps.
- Targeted tests: `pnpm -C packages/admin test` (admin-shell, shell-preferences) and `pnpm -C packages/i18n test` (use-component-i18n, i18n-text). `apps/demo` typecheck (host pages consume `useAdminShell`).
- `fallow` re-run: expect zero genuine dead-code/duplication findings; document remaining false positives.
