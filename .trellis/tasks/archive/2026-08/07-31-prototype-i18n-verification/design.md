# Prototype i18n verification design

## Package shape

```text
packages/prototype-i18n-verification/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── index.ts
    ├── plugin.ts
    ├── prototype-card.tsx
    └── locales/
        └── PrototypeCard/
            ├── en.json
            └── zh-CN.json
```

The package is private and exists only to verify the parent design. It exports:

- `PrototypeCard`;
- `prototypeI18nPlugin`;
- prototype override option types;
- package styles only if the component needs them.

## Component runtime

`PrototypeCard` imports its two JSON locale files, injects the immutable prototype override configuration, and creates a fresh local Composer:

```ts
const composer = useI18n({
  useScope: "local",
  inheritLocale: true,
  fallbackRoot: false,
  fallbackLocale: configuredFallback,
})

composer.mergeLocaleMessage("en", en)
composer.mergeLocaleMessage("zh-CN", zhCN)

for (const [locale, messages] of componentOverrides) {
  composer.mergeLocaleMessage(locale, messages)
}
```

The plugin provides only a startup snapshot containing fallback locale and optional component overrides. It does not create an i18n instance or register global messages.

## Demo runtime

`apps/demo/src/main.ts` already initializes `useAdminShellPreferencesStore(pinia)` synchronously before app mount. Extend that host startup with:

```text
preferences.locale
  → watcher in demo main.ts
    → global i18n Composer locale
      → PrototypeCard local Composer via inheritLocale
```

The demo creates one Composition API Vue I18n instance, installs it on the app, and watches the initialized preference store. The watcher uses `immediate: true` after `preferences.initialize(...)`, so the restored locale wins at startup and later preference changes flow one way to the Composer.

The prototype component is rendered in an existing demo-visible page or shell area. The demo is the only consuming application used for verification.

## Build boundary

- The prototype package Vite config includes `src/locales/**` in the Vue I18n unplugin.
- The demo Vite config includes the prototype source locale path because workspace source aliases/source consumption make the demo responsible for transforming those JSON imports during development/build.
- Both package and demo TypeScript configurations involved in source checking enable or inherit `resolveJsonModule: true`.
- `vue-i18n` is a prototype package peer/external and a demo runtime dependency.

## Verification

Use a real browser against the demo:

1. Render English prototype defaults.
2. Change the existing AdminShell locale selector to `zh-CN`.
3. Observe translated prototype text without remounting.
4. Reload and verify the restored preference initializes the global Composer correctly.
5. Configure one override and verify only that text changes.
6. Mutate the original override object after plugin installation and verify output remains unchanged.
7. Select/inject an unsupported locale in a focused scenario and verify fallback text while the global locale remains unchanged.

## Observed result — 2026-08-01

The package and source-consuming demo both typecheck and build. Their Vite outputs contain precompiled Vue I18n message ASTs for the component-first English and Chinese JSON resources. The dist-only package keeps `vue` and `vue-i18n` external and exposes a self-contained root declaration surface.

Browser verification established:

- English defaults render without the package plugin, and the package contributes no global messages.
- A partial English title override preserves the default description. Mutating the caller object after `app.use()` does not alter the mounted result.
- Preference locale changes propagate `preferences -> global Composer -> local Composer`; the persisted locale wins again after reload.
- Unsupported global locale `fr` remains `fr` globally while the local Composer renders the configured `zh-CN` fallback; without the package plugin it falls back to `en`.

Two implementation constraints amend the initial sketch:

1. Vue I18n 11.4.8 initializes an inheriting local Composer's `fallbackLocale` and `fallbackRoot` from the root Composer, overriding the local options. The component must set `composer.fallbackLocale.value` and `composer.fallbackRoot` immediately after `useI18n()` to enforce package-local fallback isolation.
2. JSON imports provide useful key inference during source typechecking, but exporting `typeof enJson` emits a declaration import for `./locales/PrototypeCard/en.json`; `unplugin-dts` does not emit that JSON into the dist-only package. Public override types therefore need an explicit interface or generated self-contained declaration unless the build deliberately copies JSON declaration resources.

Verdict: the local-Composer architecture is viable for production package work with those two corrections. Literal `@` characters in JSON messages must also use Vue I18n message-syntax escaping so precompilation succeeds.
