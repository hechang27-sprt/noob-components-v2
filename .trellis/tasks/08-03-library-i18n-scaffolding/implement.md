# Implementation plan

Ordered steps; each gate is a typecheck/test run before moving on.

## 1. Admin package: resources + typing + plugin

1. Add `tsafe ^1.8.12` to `packages/admin/package.json` dependencies; run
   `pnpm install --no-frozen-lockfile`.
2. Create `packages/admin/src/locales/AdminShell.json` and
   `AdminLoginPage.json` (locale-first; escape literal `@` in messages).
   Key schema (keep stable — public override typing mirrors it):
   - AdminShell: `account.signOut`, `fontSize.{small,medium,large}`,
     `aria.{fontSize,language,account}` (with `{label}`/`{user}`), `tabs.openPages`,
     `errors.{unableToNavigate,unableToCloseTab}`, `signedIn`.
   - AdminLoginPage: `loading.{title,description}`, `alreadySignedIn.{title,signedInAs,generic}`,
     `status.{expired,forbidden,signedOut,unknown}`, `form.{signIn,username,password,rememberMe,signingIn}`.
3. Create `packages/admin/src/i18n/admin-locale.ts` — explicit
   `AdminLocaleName`, `AdminComponentId`, `AdminShellLocale`,
   `AdminLoginPageLocale`, `AdminLocale`, `AdminLocaleOverrides`, local
   `DeepPartial` (no JSON `typeof` exports).
4. Create `packages/admin/src/i18n/plugin.ts` — `adminI18nPlugin`,
   `adminI18nOverridesKey`, `DEFAULT_SNAPSHOT`, `selectComponentOverrides`,
   defensive snapshot copy (mirror prototype; tsafe `objectEntries`).
5. Export new API from `packages/admin/src/index.ts`.

## 2. Admin package: naiveUiConfig

1. Create `packages/admin/src/runtime/naive-ui-config.ts` —
   `AdminNaiveUiConfig`, `resolveAdminNaiveUiLocale(active, fallback)`,
   `FONT_SIZE_OVERRIDES` (13/14/16px).
2. Extend `runtime/shell-preferences.ts` + store:
   - `initialize` option `fallbackLocale?: string` (default `"en"`,
     runtime-only).
   - `systemUsesDark` ref + `setSystemUsesDark` action (runtime-only).
   - `naiveUiConfig` computed (theme/system-dark, overrides, locale via
     resolver, `size`).
   - Do NOT add any of these to the persisted schema.
3. Export `resolveAdminNaiveUiLocale` + `AdminNaiveUiConfig` from index.

## 3. Admin package: component local composers

1. `AdminShell` (`admin-shell.tsx`):
   - Local composer (contract §2 pattern); `accountOptions`/`fontSizeOptions`
     labels move to `t()`; aria labels use `t("aria.*", { label, user })`;
     tab errors and fallback `signedIn` use `t()`.
   - Global composer `useI18n({ useScope: "global" })` + immediate watcher
     `preferences.locale → globalComposer.locale.value`.
2. `AdminLoginPage` (`admin-login-page.tsx`): local composer; all strings →
     `t()` incl. parameterized `signedInAs`.
3. Update `tests/admin-shell.test.tsx` and `tests/admin-login-page.test.ts`:
   provide a test i18n root (global Composer with en/zh-CN), preserve existing
   assertions, add locale-switch and override assertions.

## 4. ui package scaffold

1. Create `packages/ui/src/i18n/plugin.ts` — `uiI18nPlugin`,
   `uiI18nOverridesKey`, `DEFAULT_SNAPSHOT`, empty `NoobUiComponentId` union,
   override typing (mirror admin shape).
2. Export from `packages/ui/src/index.ts`.

## 5. Demo host

1. Create `apps/demo/src/locales/demo.json` (locale-first; keys
   `nav.*`, `tabs.*`, `login.error`, `pages.*`).
2. `main.ts`: `initialize({ defaults, fallbackLocale: "en" })`;
   `createI18n({ legacy: false, locale: preferences.locale, fallbackLocale: "en", messages: demoMessages })`;
   remove watch block; menu labels → `() => i18n.global.t("nav.<key>")`;
   login error → `i18n.global.t("login.error")`.
3. `App.tsx`: matchMedia → `preferences.setSystemUsesDark`; render
   `<NConfigProvider {...preferences.naiveUiConfig}>`.
4. `routes.ts`: tab labels become `I18nText` message keys (detail uses
   `named: { id }`); the shared demo Composer moves to `src/i18n.ts`.
5. Pages: `useI18n()` + `t("pages.<page>.*")` in dashboard, reports,
   settings, detail, internationalization.

## 5b. Reactive tab labels (I18nText cutover)

1. `packages/admin/src/i18n/i18n-text.ts` — `I18nText` discriminated union,
   `adminI18nTextSchema` (Zod), `resolveI18nText`; export from the barrel.
2. `AdminShellTabDescriptor.label: I18nText`; shell renders `i18n`-kind
   labels via `globalComposer.t` at render time.
3. `packages/admin-vue-router` persisted-tab schema: `label: adminI18nTextSchema`.
4. `snapshotTab` returns plain-data copies (reactive proxies cannot be
   `structuredClone`d); navigation catches log the original error.
5. Tests: shell i18n-kind label reactivity; router label persistence and
   restore; demo detail-tab named interpolation.

## 6. Verification

```sh
pnpm install --no-frozen-lockfile
pnpm --filter @noob-naive-ui/admin typecheck && pnpm --filter @noob-naive-ui/admin test
pnpm --filter @noob-naive-ui/admin build
pnpm --filter @noob-naive-ui/ui typecheck && pnpm --filter @noob-naive-ui/ui build
pnpm --filter demo typecheck && pnpm --filter demo build
pnpm exec oxlint --type-aware packages/admin packages/ui apps/demo
pnpm format:check
pnpm exec tsc -b --noEmit && pnpm typecheck
```

Browser (dev server): en defaults; zh-CN via locale dropdown → shell texts,
demo pages, sidebar menu, naive-ui locale all switch; reload persists; `fr`
renders en fallback while active locale stays `fr`; override plugin leaf
change (temporary harness or prototype-style install); no console errors.

## 7. Review gates / rollback

- After each package step: `pnpm --filter @noob-naive-ui/admin typecheck` +
  `test`. Tests failing on missing i18n root are the first gate.
- Declaration audit: `packages/admin/dist/*.d.ts` must not import JSON.
- Rollback points: step 1 (package.json+lockfile), step 3 (component
  rewrites), step 5 (host wiring). Demo visuals are the final gate.
