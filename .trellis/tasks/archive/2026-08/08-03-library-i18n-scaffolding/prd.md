# Library i18n scaffolding (ui + admin) and demo host texts

Child of `07-31-library-i18n-integration`. The architecture was verified in
`07-31-prototype-i18n-verification`; this task rolls the verified pattern into
the production `ui` and `admin` packages and localizes the demo host's own
texts.

## Goal

- `admin`: component-local Vue I18n for `AdminShell` and `AdminLoginPage` with
  bundled `en` / `zh-CN` defaults, plus the typed `adminI18nPlugin` override
  transport. `AdminShell` owns the store→global-Composer locale sync; the
  preference store owns a `naiveUiConfig` computed that the host binds onto
  `NConfigProvider`.
- `ui`: i18n scaffolding (override transport + typing) for future components;
  the package currently ships no translatable text.
- `demo`: the host's own texts (nav labels, tab labels, page content, login
  error) move into one app-level global-Composer message registry with `en` /
  `zh-CN` resources; the host binds `preferences.naiveUiConfig` and seeds
  `createI18n` with the hydrated preference locale.

## Confirmed decisions (from parent design + this session)

- Keep `useAdminShellPreferencesStore.locale` as the one-way source of truth;
  do NOT make the global Composer the persisted source.
- The store→Composer watcher moves from the host into `AdminShell`
  (immediate). The host seeds `createI18n({ locale: hydratedPreference })` so
  the pre-auth login page renders the restored locale before `AdminShell`
  mounts.
- `naiveUiConfig` is a store computed (theme incl. system dark, font-size
  overrides, naive-ui component size, naive-ui locale) derived from
  preferences; the host renders
  `<n-config-provider v-bind="preferences.naiveUiConfig">` around its router
  view. The admin package owns the mapping functions; naive-ui locale mapping
  uses the host fallback authority supplied to `initialize`.
- Locale resources are locale-first single files:
  `src/locales/<ComponentName>.json` (`{ "en": …, "zh-CN": … }`), precompiled
  by the existing shared `createWorkspaceVueI18nPlugin()` preset.
- Public locale interfaces are explicit and self-contained; never export
  `typeof` a JSON import.
- All hardcoded UI text in `AdminShell`, `AdminLoginPage`, and demo pages moves
  into resources. No naive-ui locale-text components are used by the demo
  pages today, so naive-ui locale is correctness wiring verified by value.

## Requirements

- Package components render built-in `en` / `zh-CN` text after the host
  installs Vue I18n, without package-specific setup; texts follow global
  locale changes reactively.
- `adminI18nPlugin` transports a defensively-copied immutable startup snapshot;
  later caller mutation must not affect mounted or future components.
- Override precedence is deterministic: component defaults < plugin overrides;
  partial overrides preserve sibling defaults.
- `AdminShell` keeps `locale` and `fallbackLocale` authority in the host
  global Composer; unsupported package locales render the host fallback while
  the global active locale stays unchanged.
- `naiveUiConfig` preserves current demo presentation behavior at defaults
  (dark/light/system with matchMedia, 13/14/16px font overrides) and adds the
  naive-ui `size` tier and naive-ui `locale` prop.
- The demo global Composer carries the demo's own messages; demo menu labels
  react to locale switches; tab labels are captured at open time (documented
  limitation: open tabs keep their label language until reopened).
- No changes to the prototype package, `admin-vue-router`, or
  `admin-starter` (stub) in this task.

## Acceptance criteria

- [ ] `AdminShell` and `AdminLoginPage` render `en` defaults without the
      plugin and `zh-CN` when the global locale is `zh-CN`; all hardcoded UI
      strings are removed from both components.
- [ ] Changing the locale in the shell dropdown updates store, global
      Composer, both components' texts, and `naiveUiConfig.locale`; the value
      persists and is restored on reload; the pre-auth login page renders the
      restored locale.
- [ ] `adminI18nPlugin` partial override changes only specified message
      leaves; caller mutation after install has no effect; sibling defaults
      remain.
- [ ] Unsupported locale (e.g. `fr`) leaves the global active locale
      unchanged while package texts and `naiveUiConfig.locale` resolve through
      the host fallback (`en` in the demo).
- [ ] `App.tsx` binds `preferences.naiveUiConfig` on `NConfigProvider`;
      theme, system-dark, font size, `size` tier, and naive-ui locale all
      follow preferences; behavior at defaults matches the current demo.
- [ ] Demo host texts (nav, tabs, pages, login error) are localized `en` /
      `zh-CN` and reactive where components render them.
- [ ] `ui` exposes its i18n override transport and typing scaffold.
- [ ] Typecheck, package builds, demo build, oxlint, and format checks pass;
      emitted package declarations contain no imports of absent JSON
      resources; locale JSON is precompiled in package and demo outputs.
- [ ] Admin package unit tests (shell-preferences incl. `naiveUiConfig`
      boundary, shell/login rendering) pass with the new i18n wiring.

## Out of scope

- Translating other/future components; lazy-loaded locale resources;
  runtime-reactive override replacement; prototype package changes;
  `admin-starter`; naive-ui locale-text demo content (none exists).
