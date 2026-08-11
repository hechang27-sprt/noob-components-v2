# Implement: AdminProvider + demo adoption + injection removal

## Ordered checklist

1. **`packages/admin/src/i18n-or-consumption/admin-provider.ts`** (or `use-admin-provider.ts`) (new) —
   `useAdminProvider()` composable reading `useAdminShellPreferencesStore()` +
   `useAdminShellMenuStore()`, exposing the curated surface (read-only state + actions). Stores are
   implementation detail; no provide/inject.
2. **`packages/admin/src/components/admin-provider.tsx`** (new) — `defineComponent` `AdminProvider`:
   - props: `messages`, `menu`, `preferences`, `theme?` (types from existing admin types + loose
     `messages`).
   - `setup`: `preferences.initialize(props.preferences)`; `menu.configure(props.menu)`;
     `watch(() => props.messages, seed, { immediate: true })` seeding the global Composer via
     `useI18n({ useScope: "global" }).setLocaleMessage`; render `<NConfigProvider {...preferences.naiveUiConfig} theme={props.theme}>` around slot.
   - Document every field per AGENTS.md.
2. **`packages/admin/src/index.ts`** — export `AdminProvider` (+ props type).
3. **`packages/admin/tests/admin-provider.test.tsx`** + **`use-admin-provider.test.ts`** (new) —
   `AdminProvider` seeds global on mount + on `messages` prop change, configures menu/preferences
   once, renders `NConfigProvider`; `useAdminProvider()` projects store state and calls actions
   through the stores (state survives remount; actions mutate the store).
4. **Demo adoption**:
   - `apps/demo/src/locale-provider.tsx` — delete (replaced).
   - `apps/demo/src/App.tsx` — import `demo.json`, pass `messages={demoMessages}` +
     `menu={createDemoMenu()}` + `preferences={{...}}` to `AdminProvider`; drop the manual
     `NConfigProvider`/`NGlobalStyle`/`LocaleProvider` (keep host presentational wiring: font-size
     watcher, color-scheme listener if still needed).
   - `apps/demo/src/main.ts` — remove `preferences.initialize` + `menu.configure` + the
     `i18n.global.locale.value = preferences.locale` line (all move into `AdminProvider.setup`);
     keep `auth.configure` + `createAdminRouterPlugin`; confirm `createDemoMenu` import site.
5. **`tooling/vite/vue-i18n.ts`** — already simplified (transform recording-only, injection removed).
   Re-verify nothing references `COMPOSER_DECL_PATTERN`.
6. **Docs** — `library-i18n-contract.md`: add the "import locale resources in a component" +
   `AdminProvider` convention. Note the stale `noob-workspace-locale-hmr-boundaries` skill (cannot
   edit — user-authored; flag for replacement).

## Validation

- `pnpm --filter admin typecheck`
- `pnpm --filter admin test` (admin-provider + existing)
- `pnpm --filter demo typecheck`
- `pnpm --filter demo build`
- Browser (methodology per `noob-demo-browser-verification-setup`): login, edit `demo.json`,
  assert `(client) hmr update` bounded at the importing component (no `page reload`), beforeunload
  counter stays 0, heading text updates in place.

## Risky files / rollback

- `apps/demo/src/main.ts` (auth ordering — must stay before `app.use(adminRouter)`).
- `apps/demo/src/App.tsx` (host presentational wiring preserved).
- `packages/admin/src/components/admin-provider.tsx` (new package API — contract + docs).

## Follow-up before `task.py start`

- [ ] `prd.md` / `design.md` / `implement.md` complete and reviewed (this file).
- [ ] No blocking open questions in `prd.md`.
- [ ] `implement.jsonl` / `check.jsonl` curated with real context entries (if sub-agent dispatch).
