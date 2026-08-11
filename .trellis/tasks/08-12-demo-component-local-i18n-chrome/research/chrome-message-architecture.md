# Research: chrome-consumed global message keys (nav/tabs/login)

Status: **OPEN** — options below are initial analysis, not a settled recommendation.

## Problem

`demo.json` is imported and wired into the app-global Vue I18n Composer at **app setup** time
(`apps/demo/src/locales/demo.json` → `apps/demo/src/i18n.ts`). Editing it full-reloads the page
unless `createWorkspaceLocaleHmrPlugin` (`tooling/vite/vue-i18n.ts`) injects a plain-module
accept boundary. That injection is regex-based (scan for top-level `createI18n`/`createComposer`,
append `import.meta.hot.accept` that re-applies the resource via `setLocaleMessage`) and is the
fragility we want to eliminate or narrow.

Component-scoping (loading at setup) only covers `pages.*`. The **chrome** groups cannot move to
component setup:

| group | consumer (module-scope) |
|---|---|
| `nav.*` | `main.ts` `createDemoMenu()` → `label: () => i18n.global.t(labelKey)` |
| `tabs.*` | `routes.ts` `tabPresentation` → `I18nText { kind: "i18n", key }`, resolved by AdminShell against the host global Composer at render time |
| `login.*` | `main.ts` `login()` → `i18n.global.t("login.credentialsRequired")` before mount |

`createComponentI18n` is a composable; it cannot run in non-component modules. The `I18nText`
tab-label contract is deliberately "resolve against host global Composer at render time" so open and
history-restored tabs render in the current locale after refresh/restore.

## Constraint inventory

- Chrome must live in a Composer that non-component modules can reach at module scope → the global
  Composer (`i18n.global`).
- The global Composer is created once in a plain module (`i18n.ts`). Any edit to its message
  source requires an accept boundary (injection) or a full reload.
- `library-i18n-contract.md` + `08-04-library-i18n-plugin-factory` mandate the plugin as the *single*
  host-override transport, with a frozen startup snapshot (defensive `structuredClone` at
  `app.use`). Runtime-updatable chrome would need to relax that.
- PRD `08-06-workspace-locale-hmr-tabbar` holds "no app-side `import.meta.hot.accept` patch — the
  preset owns the boundary generically."

## Candidate options

### (a) Keep `createWorkspaceLocaleHmrPlugin` injection (status quo)
- Pros: tooling-owned and generic; every current/future workspace app/package gets
  `src/locales/*.json` HMR for free; serve-only; guarded (fires only for modules importing a locale
  JSON **and** declaring a top-level composer **and** no existing `hot.accept`); production builds
  strip `import.meta.hot`.
- Cons: regex-driven code append (fragile-looking); couples tooling to source-text shape; does not
  remove the `createI18n`/`createComposer` declaration assumption.

### (b) App-side / typed helper wrapping `import.meta.hot.accept`
- e.g. `registerLocaleResourceHmr(i18n, resource)` or `hotApplyLocaleOnChange(i18n, resourceUrl)`
  exported from `@noob-naive-ui/i18n`; `i18n.ts` calls it explicitly.
- Pros: no regex; typed; the HMR concern is expressed at the call site next to the composer;
  explicit and debuggable.
- Cons: per-app call site (every host must remember it); reverses the "no app-side HMR code"
  constraint; still a plain-module chain (the helper itself registers the accept).

### (c) Inline chrome messages as a JS object in `i18n.ts` (no JSON import)
- Pros: no `src/locales/*.json` import in a plain module → the injection never fires for chrome;
  chrome edits become `.ts` edits.
- Cons: editing `i18n.ts` (a plain module) still full-reloads; loses JSON resource separation and
  unplugin precompilation; not really better, just relocated.

### (d) Reactive / updatable global-Composer seed
- Provide chrome messages through the existing plugin snapshot but make it updatable (a provided
  `setMessages`/`mergeOverrides`), or seed the global Composer from a reactive store.
- Pros: keeps the single transport; enables runtime/editable chrome without reload; reuses the
  existing architecture.
- Cons: reverses the frozen-startup-snapshot decision in `library-i18n-contract.md`; HMR still
  needs to trigger the update (via the injection, a helper, or a watcher on the store); larger
  change.

### (e) Re-architect menu/tab-label consumption away from module-scope global reads
- Menu labels: convert `createDemoMenu` labels to `I18nText` resolved by AdminShell (like tab
  labels) instead of `i18n.global.t` closures.
- Tab labels: already `I18nText` resolved against the global Composer — the resolution point is
  AdminShell, which is a component, but the *messages* (`tabs.*`) still must be reachable there
  (via fallbackRoot → global, or a component-provided composer).
- Pros: could move the *resolution* into component scope (reducing module-scope global reads).
- Cons: does **not** move the *messages* — `nav.*`/`tabs.*`/`login.*` still need to be present in a
  composer reachable at render time; likely still the global Composer. Investigate whether a
  host-provided component-local Composer (e.g. AdminShell's) could carry chrome keys via the plugin
  override slice — but that couples host chrome to a package component's composer.

### (f) Other (to investigate)
- unplugin-vue-i18n built-in HMR for the virtual modules: does it re-apply to a plain-module
  aggregator automatically? (Current finding: no — a plain importer without an accept boundary
  still full-reloads; that is exactly why the injection exists.)
- Split chrome vs page content and give chrome its own small resource, keeping the injection
  scoped to a single chrome file (reduces, does not remove).
- Move `login.credentialsRequired` resolution into a component (it is used by the login page via
  `getComponentI18n`? — currently read at `main.ts` `login()`; could move the message to the login
  page's local composer) and menu/tab labels to `I18nText` — shrinking the module-scope set to
  as close to zero as possible, then handling the residual with the least-fragile mechanism.

## Open items to settle

1. Does the "no app-side `import.meta.hot.accept`" constraint still hold? (determines (a) vs (b))
2. Can menu labels move to `I18nText` resolved by AdminShell, removing the `main.ts` `i18n.global.t`
   reads for `nav.*`? (reduces module-scope reads, does not move messages)
3. Can `login.credentialsRequired` move into the login page's component-local Composer?
4. Is runtime-updatable chrome (option d) in scope, or is dev-HMR the only driver?
5. What is the minimal, least-fragile mechanism for the residual global chrome set?

## Verification methodology (for later)

- Browser test: edit the chrome resource / `i18n.ts` and confirm in-place update (or a justified
  reload) with no app crash; `sessionStorage` `beforeunload` counter stays 0 for in-place updates;
  all open tabs preserved (see `noob-demo-browser-verification-setup` + `noob-demo-browser-tab-history-repro`).

## UPDATE 2026-08-12 — "cannot move" claim corrected (provider-seeding)

The earlier claim "chrome keys cannot move to component setup" was **too strong**. Re-analysis:

**The reload came from the IMPORT, not the READS.** `i18n.ts` (a plain module) *imports* `demo.json` at
app setup. The consumers that *read* chrome (`main.ts` menu-label closures, `routes.ts` tab-label
`I18nText`, `main.ts` `login()`) are all **lazy — evaluated at render/run time, after mount**. So they
do NOT need the messages at module scope; they need them present in `i18n.global` **by the time they
evaluate**. Nothing reads chrome before the app mounts.

**Fix: move the IMPORT into a component.** A root provider component (defineComponent) imports the
locale resource in its `setup` and seeds `i18n.global` via `setLocaleMessage(locale, messages)` per
locale, rendering its slot. Because the provider is a Vue component, plugin-vue-jsx self-accepts it →
editing the resource re-runs the provider's setup → re-imports fresh messages → re-seeds `i18n.global`
→ all consumers re-render. **Same mechanism that already makes `AdminShell.json` work. No injection.**

- Provider mounts synchronously parent-first, so `setup` seeds `i18n.global` **before** `<RouterView>`
  renders children → no untranslated flash.
- Consumers stay byte-for-byte unchanged (menu closures, tab `I18nText` → global, `login()`).
- Editing the resource remounts only the small provider leaf (a self-accept boundary), not AdminShell,
  so the Pinia-backed tab registry (from `vtnrktnotrqu`) is untouched.
- The `createWorkspaceLocaleHmrPlugin` injection becomes **dormant** for the demo (no plain module
  imports a locale JSON anymore). Cleanup decision: remove it, or keep as a safety net for future
  plain-module aggregators.

**Mechanism comparison (seed-global vs Pinia store vs provide/inject):**

| approach | what changes | coupling risk |
|---|---|---|
| **Seed `i18n.global` from a provider component** (recommended) | import moves into a component; consumers unchanged | none — `i18n.global` is already the shared context |
| **Pinia store** for chrome | consumers must read from the store; AdminShell (a *package* component) resolving tab `I18nText` against a host store couples package → host | high |
| **Provide/inject composer** (NConfigProvider-style) | a provider creates a local composer, provides it; AdminShell + menu closures must `inject` it | high — package components would depend on a host-injected key |

The NConfigProvider analogy is right about the *shape* (component provides context), but the context
chrome needs is `i18n.global` — which already exists and is already the resolution point for the
package's tab-label `I18nText` contract. Seeding it from a component is the minimal fix; store and
provide/inject buy stricter component-locality at the cost of coupling package components to host
storage.

## VALIDATED 2026-08-12 — provider-seeded i18n.global spike (browser-proven)

**Change:** `i18n.ts` no longer imports `demo.json` (empty global Composer, locale/fallback
only). New `apps/demo/src/locale-provider.tsx` (`DemoLocaleProvider`, defineComponent) imports
`demo.json` in `setup`, `setLocaleMessage(locale, messages)` per locale, renders its slot.
Mounted in `App.tsx` around `<RouterView>`.

**Result (browser, port 5175, `DEBUG=vite:hmr`):**
- Server log on `demo.json` edit: `[file change] src/locales/demo.json` →
  `(client) hmr update /src/locale-provider.tsx` — **precise JS update bounded at the provider,
  no page reload.**
- Reload-proof beforeunload counter stayed `0` through the edit AND the revert.
- Rendered dashboard heading changed `Dashboard` → `Dashboard-PROBE-HMR` → back to `Dashboard`.
- `src/locale-provider.tsx` appears in `[self-accepts]` at startup (plugin-vue-jsx hot-registers it).

**Why the regex injection was NOT involved:** `createWorkspaceLocaleHmrPlugin.transform` only
injects when a module imports a workspace `src/locales/*.json` AND declares a top-level
`createI18n`/`createComposer`. After the change no plain module imports a locale JSON (`i18n.ts`
is clean), and the provider is a component with no top-level composer declaration — so
`COMPOSER_DECL_PATTERN` never matches. The HMR ran purely on provider self-accept +
`handleHotUpdate`'s virtual-module redirect (the same machinery that already served package
components like `admin-shell.tsx`).

**Consequence:** the regex-based accept injection is proven unnecessary for the demo. The
`handleHotUpdate` redirect (virtual module) is still required for any real-JSON edit (no graph
edge from the JSON to anything — see skill `noob-workspace-locale-hmr-boundaries`). The injection
portion (`transform` accept-block) is now dormant for the demo and is a candidate for removal
(decision: remove vs. keep as safety net for future plain-module aggregators).

**Open design points for the "best architecture" discussion:**
1. Where the provider lives (separate leaf `LocaleProvider` vs. folded into `App.tsx`) — leaf
   chosen so HMR remounts only the tiny provider, not AdminShell (Pinia tab registry untouched).
2. Whether demo pages should ALSO move to component-local i18n (createComponentI18n) with their
   own per-page resources (R1), or keep reading global (spike used the single demo.json as-is).
3. Whether `setLocaleMessage` (replace per-locale) is the right seed primitive vs `mergeLocaleMessage`.
4. Whether to remove the now-dormant injection from `createWorkspaceLocaleHmrPlugin`.
5. Update `library-i18n-contract.md` if the mechanism change becomes permanent.

## CONFIRMED 2026-08-12 — injection fully removed from `transform`, HMR still works

**Change:** removed the regex accept-block injection from
`createWorkspaceLocaleHmrPlugin.transform` in `tooling/vite/vue-i18n.ts`. Deleted
`COMPOSER_DECL_PATTERN`; `transform` now only records the real-file → importer map (needed by
`handleHotUpdate`). Kept `handleHotUpdate` (virtual-module redirect — still required, no graph edge
from real JSON).

**Verification (browser, port 5175, `DEBUG=vite:hmr`, with the injection gone):**
- Server log on `demo.json` edit: `[file change] src/locales/demo.json` →
  `(client) hmr update /src/locale-provider.tsx`. **No `page reload` line.**
- beforeunload counter stayed `0` across edit AND revert (two separate `demo.json` writes).
- Rendered heading: `Dashboard` → `Dashboard-SIMPLIFIED-HMR` → `Dashboard`.
- `pnpm --filter demo typecheck` passes; `pnpm --filter demo build` succeeds (plugin is
  serve-only, production unaffected).

**Conclusion:** the regex-based code injection is fully removable. Locale HMR now relies entirely on
(1) component imports of locale resources at setup (self-accept boundary) and (2) the plugin's
`handleHotUpdate` virtual-module redirect. This is exactly the mechanism package components already
used — the demo now matches it via the `LocaleProvider`.

**Remaining design decisions (see PRD):** provider placement (leaf chosen), pages → component-local
(R1) vs global-read, `setLocaleMessage` vs `mergeLocaleMessage`, whether to keep the now-dormant
injection as a safety net (currently removed), and `library-i18n-contract.md` + skill doc updates to
reflect the "import locale resources in a component" convention.
