# Design — locale JSON HMR boundaries + AdminShell tab-state reset

Status: Parts A and B implemented and browser-verified. Part C pending user scope decision (Q1 in prd.md).

## Part A — preset-injected locale accept boundary (done, verified)

### Mechanism

`createWorkspaceLocaleHmrPlugin.transform` (enforce `pre`, serve-only) now:

1. Records every static JSON import of a workspace locale resource (unchanged, but the importer guard was removed in the prior fix — all source modules are recorded).
2. When a module both imports a workspace locale JSON **and** declares a Vue I18n composer at top level (`const/let/var X = createI18n|createComposer(...)`, optionally `export`-ed), appends:

```js
if (import.meta.hot) {
  import.meta.hot.accept("./locales/demo.json", (next) => {
    const resource = next?.default ?? {};
    for (const [locale, messages] of Object.entries(resource)) {
      (i18n.global ?? i18n).setLocaleMessage(locale, messages);
    }
  });
}
```

- The dep specifier is the source import's own relative specifier; Vite's import-analysis resolves it to the Intlify virtual module URL, so propagation matching works (verified: served `/src/i18n.ts` shows the accept with `./locales/demo.json` rewritten to `/@id/virtual:intlify-i18n-0`).
- `(X.global ?? X)` handles both `createI18n` results (composer on `.global`) and raw `createComposer` results.
- Composer detection is line-anchored (`/^(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*(?:createI18n|createComposer)\(/gm`) so only module-scope declarations qualify — function-scoped declarations (component setup) are indented and keep relying on the component's own self-accepting HMR. Modules that already hand-write `import.meta.hot.accept` are skipped (no double-application).
- `handleHotUpdate` still returns the Intlify virtual modules; the injected accept is what makes a plain-`.ts` importer a propagation boundary, so `apps/demo/src/i18n.ts` no longer needs its hand-written patch (removed).

### Verification

- Served `/src/i18n.ts` contains the injected block; `apps/demo/src/i18n.ts` source has no `import.meta.hot`.
- Browser: `Reports` → `Reports-HMR` after editing `demo.json`; `bu: 0`; tabs `[Dashboard, i18n, Reports]` intact; shell node unchanged.

## Part B — hot slot components (done, verified)

`AdminShellTabbar`, `AdminShellNavLeft`, `AdminShellNavRight` converted from plain function components to `defineComponent(() => { …setup… return () => …render… }, { name })`. All reactive reads moved into the render closure so behavior is identical (the functional version read them per render; the setup version must not capture them once). Read-render pattern is unchanged; only the declaration shape changed.

Effect: plugin-vue-jsx hot-registers the modules (`__hmrId` + `createRecord` + `import.meta.hot.accept(({X}) => reload)`). An edit now re-executes and reloads only the leaf; propagation stops there (`[self-accepts] admin-shell-tabbar.tsx` in `DEBUG=vite:hmr`), so `AdminShell` is not remounted and the setup-scoped tab registry survives. Functional-leaf remount is harmless (re-reads the provided controller).

### Verification

- Server log: `hmr update …admin-shell-tabbar.tsx` (plus admin `style.css` for Tailwind) — no `admin-shell.tsx` in the update.
- Browser: class edit `h-4/5` → `h-1/3` → `tabKeys` stays `[Dashboard, i18n, Reports]`, `bu: 0`, shell node unchanged, class applied.

## Part C — remaining collapse class (Option P chosen, pending approval)

Triggers that still collapse tabs (their HMR boundary is AdminShell itself): edits to `AdminShell.json`/`AdminLoginPage.json` (imported by `admin-shell.tsx`), `admin-shell.tsx`, `use-admin-shell-tabs.ts`. Root cause: the shell's tab registry is `useAdminShellTabs` setup-scoped; Vue HMR `reload` remounts the shell.

### Option P (chosen) — Pinia-backed tab registry

Move the tab *state* out of setup scope into a package-owned Pinia store (`packages/admin/src/stores/tabs.ts`, `useAdminShellTabsStore`), following the existing store pattern:

- Store holds only serializable state: `tabs` (reactive `Map`), `visibleTabs` (ref), `knownPageIds` (Set), `pendingOpen`, `healingRevives`, and a `clear()` mutator. Controller functions (activate/close/requestDestination/recordOrHealActive) stay in `useAdminShellTabs`, which becomes a thin controller over the store — matching the navigation store's "state in store, callbacks in composable" contract (`pinia.state` stays plain data; no callbacks serialized).
- The store survives HMR remounts (its module is never re-executed by the collapse triggers). The shell's membership ownership (heal/`knownPageIds` policy) is preserved — only the storage location changes.
- **Session reset:** the store watches `useAdminAuthStore().status.kind` and clears on transition to `unauthenticated` (logout, cross-tab invalidation). HMR remounts leave auth status unchanged → no spurious reset. This replaces `onBeforeUnmount(clearTabs)` (which must be removed — a remount would wipe the shared store).
- **Watch change in `useAdminShellTabs`:** the immediate watch must NOT clear on first run (previously `!previousHasNavigation → clearTabs` was correct for per-setup state; with a shared store it would wipe tabs on every remount). Clear only on a real adapter identity change within a setup: `previousNavigation && navigation !== previousNavigation`. First-run/remount seeds via `recordOrHealActive` (store already populated on remount).

Trade-offs: a new package store + auth-store coupling for the reset signal; editing `stores/tabs.ts` itself still collapses tabs (its own module re-executes — same class as editing `use-admin-shell-tabs.ts` today, acceptable). Multi-shell: nested shells over one pinia share the registry — consistent with them already sharing the single navigation authority.

### Alternatives considered

- **Option A — adapter-tracked registry** (`AdminShellNavigation.committedTabs` maintained by `router.afterEach` upsert + close removal, reset in `enterScope`, shell rehydrates on setup). No new store, but extends the host-to-shell authority to full membership (a shift from "shell owns membership"), requires rehydration logic, and adds an adapter interface field + adapter test churn.
- **Option S — sessionStorage persistence** keyed by scopeId, host clears on logout. No interface change, but adds a serialization layer, storage-failure edge cases, multi-tab races, and a new host responsibility that is easy to forget.

Option P was chosen over A because it preserves the settled "shell owns membership" contract (A relocates it), requires no public interface change, and has no rehydration/serialization surface; the auth-status reset is package-internal. Rollback: drop the store and restore setup-scoped state.

## Compatibility / rollback

- Part A is serve-only; production builds and built consumers are untouched.
- Part B changes declaration shape only; the package export surface (`AdminShellTabbar` etc.) is unchanged.
- Part C (Option A) adds an optional interface field; the router-neutral shell contract (skill `noob-admin-shell-command-only-navigation`) is preserved — the adapter stays in `admin-vue-router`, lifecycle methods stay out of Pinia.
- Rollback: Part A — restore the app patch or revert the preset transform; Part B — revert to function components; Part C — revert the interface field + rehydration.
