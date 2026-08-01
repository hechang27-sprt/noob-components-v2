# Prototype i18n verification package

## Goal

Create a minimal private package at `packages/prototype-i18n-verification` containing one localized Vue component, then consume it from `apps/demo` to verify the selected Vue I18n local-Composer architecture end to end.

Parent design task: `07-31-library-i18n-integration`.

## Scope

### Prototype package

- Package name: `@noob-naive-ui/prototype-i18n-verification`.
- One small visible component, such as a card or button, with localized text.
- Component-first JSON resources:
  - `src/locales/PrototypeCard/en.json`
  - `src/locales/PrototypeCard/zh-CN.json`
- `resolveJsonModule: true`.
- `@intlify/unplugin-vue-i18n` build-time resource precompilation.
- One optional package plugin that provides immutable startup overrides for the prototype component.
- One local Composer created empty with `useScope: "local"`, `inheritLocale: true`, and `fallbackRoot: false`.
- Defaults merged first and the component override slice merged second with `mergeLocaleMessage()`.
- Configurable fallback locale defaulting to `"en"`.

### Demo integration

- Add the prototype package as a workspace dependency of `apps/demo`.
- Configure the demo Vite i18n plugin to transform both demo and source-consumed prototype locale JSON.
- Create and install one global Vue I18n instance in `apps/demo/src/main.ts`.
- Import and render the prototype component in the demo.
- Watch `useAdminShellPreferencesStore().locale` and write it one-way into the global Composer locale after preferences initialization.
- Verify changing the existing AdminShell locale preference updates the prototype component.

## Acceptance criteria

- [x] The prototype package builds and typechecks as a private workspace library.
- [x] The demo imports and visibly renders its localized component.
- [x] English defaults render without installing the prototype override plugin.
- [x] Installing a partial prototype override changes the specified leaf while preserving default sibling text.
- [x] The component uses local scope and does not register package messages globally.
- [x] Changing the AdminShell locale preference updates the global Composer and then the component-local Composer through `inheritLocale`.
- [x] Unsupported locales use the host global Composer's configured fallback without changing its active locale.
- [x] Mutating the caller's override input after plugin installation has no effect.
- [x] JSON resources are precompiled in both the package build and demo source-consuming build.
- [x] Demo build, package build/typecheck, and a browser-driven locale-switch smoke scenario pass.
- [x] Findings are fed back into the parent design task before production package work begins.

## Out of scope

- Multiple prototype components.
- A separate consuming fixture application.
- Naive UI locale-provider verification.
- SSR benchmarking or broad performance benchmarking.
- Production `ui` or `admin` component translation.
- Lazy locale loading or runtime-reactive override replacement.
