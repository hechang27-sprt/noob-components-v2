# Design library i18n integration

## Goal

Design a low-boilerplate internationalization contract for `@noob-naive-ui/ui` and `@noob-naive-ui/admin` in which the host owns one global Vue I18n instance, component-local Composers render precompiled package defaults without cross-library key collisions, and optional package plugins provide typed host overrides.

## Confirmed decisions and constraints

- Stay with `vue-i18n`; researched alternatives remain design evidence only.
- The host creates and installs the only global Vue I18n instance. Component libraries never create an independent application-level instance.
- Translating library components create local Composers with `useScope: "local"`, inherit the global locale, and disable root-message fallback.
- Local message registries isolate identical keys across components and packages; no translation-key package namespace is required.
- Each package exposes an optional app-scoped provider plugin carrying only host overrides. Components render bundled defaults when the plugin is absent.
- `AdminShell` locale preferences may coordinate with the global Composer, but the Composer remains a runtime dependency outside serializable Pinia state.
- Locale ownership is one-way: `useAdminShellPreferencesStore.locale` is the source, the global Composer locale is the target, inherited local Composers follow the global locale, and the Naive UI `NConfigProvider` receives locale data derived from the global locale. Synchronization begins only after preferences hydration.
- Unsupported package/provider locales fall back to a plugin-configured fallback locale, defaulting to `"en"`. The global Composer locale remains unchanged for host content.
- Components create a fresh empty local Composer, merge their defaults, then merge their selected overrides. This avoids custom deep-merge code and prevents mutation of imported default resources.
- Locale resources use JSON plus `@intlify/unplugin-vue-i18n` precompilation.
- TypeScript configuration enables `resolveJsonModule: true` so the canonical JSON resource can inform locale/override types.
- Resource organization is component-first: `src/locales/ComponentName/localeName.json`.
- `AdminShell` can coordinate a persisted locale preference with the global Composer, but no Composer enters serializable Pinia state.

## Requirements

- Package-plugin overrides are immutable in effect: installation captures application-scoped startup configuration, and later mutation or replacement of the caller's input must not update mounted or subsequently mounted components.
- Package components render built-in text after the host installs Vue I18n, without package-specific setup.
- A host can install the relevant package plugin and provide partial, typed overrides for any package-owned component message.
- Override precedence is deterministic: `component defaults < package plugin overrides`.
- Overrides are app/request-scoped and cannot leak across Vue applications, tests, or SSR requests.
- Component-local Composers follow global locale changes automatically.
- Missing local keys do not resolve through the host-global message registry.
- Locale resources are precompiled at build time rather than parsed from raw message syntax in the browser.
- Components merge only their own resource and override slices, avoiding package-wide merge work per component instance.
- Stable component override identifiers and supported locale names are part of the package API.
- The design must specify locale fallback behavior when the global locale is unsupported by a component package.

## Selected candidate architecture

### Host setup without overrides

```ts
const i18n = createI18n({
  legacy: false,
  locale: "en",
})

app.use(i18n)
```

### Optional package overrides

```ts
app.use(adminI18nPlugin, {
  messages: {
    en: {
      AdminShell: {
        account: {
          signOut: "Log out",
        },
      },
    },
  },
})
```

The plugin only provides overrides under a package-owned injection key. It does not create a Composer, import defaults, or register global messages.

### Component resources

```text
packages/admin/src/locales/
├── AdminShell/
│   ├── en.json
│   └── zh-CN.json
└── AdminLoginPage/
    ├── en.json
    └── zh-CN.json
```

### Component setup

```ts
const packageOverrides = inject(
  adminOverrideMessagesKey,
  EMPTY_ADMIN_OVERRIDES,
)
const componentOverrides = selectAdminComponentOverrides(
  packageOverrides,
  "AdminShell",
)

const composer = useI18n({
  useScope: "local",
  inheritLocale: true,
  fallbackRoot: false,
})

for (const [locale, messages] of Object.entries(defaultMessages)) {
  composer.mergeLocaleMessage(locale, messages)
}
for (const [locale, messages] of Object.entries(componentOverrides)) {
  composer.mergeLocaleMessage(locale, messages)
}
```

Starting with an empty local Composer is required because Vue I18n retains a plain `messages` object supplied to `useI18n()`; later merges could otherwise mutate imported module-level defaults and leak overrides between instances or applications.

## Typing direction

Borrow Naive UI's locale API shape without importing its concrete `NLocale` types or `createLocale()` implementation:

```ts
export interface AdminLocale {
  AdminShell: AdminShellLocale
  AdminLoginPage: AdminLoginPageLocale
}

export type AdminPartialLocale = DeepPartial<AdminLocale>

export type AdminLocaleOverrides = Partial<
  Record<AdminLocaleName, AdminPartialLocale>
>
```

JSON key inference, generated declarations, and the unplugin/declaration-build interaction must be verified before finalizing the exact exported type construction.

## Acceptance criteria

- [ ] A host installing only Vue I18n sees package-default component text.
- [ ] Installing a package override plugin changes only the specified component message leaves.
- [ ] Mutating or replacing the caller's override object after plugin installation does not affect mounted or subsequently mounted components.
- [ ] Unspecified sibling messages retain package defaults.
- [ ] Identical keys in separate component-local Composers do not collide.
- [ ] Changing the global Composer locale updates all inherited local Composers.
- [ ] Repeated mounts do not mutate imported defaults or leak one app's overrides to another app/test/request.
- [ ] Component-local resources are emitted from `src/locales/ComponentName/localeName.json` and precompiled by the library and source-consuming demo builds.
- [ ] TypeScript checks JSON imports with `resolveJsonModule: true` and exposes useful typed partial overrides.
- [ ] Build output is compatible with the intended Vue I18n runtime/compiler configuration.
- [ ] `AdminShell` locale preference startup precedence and synchronization behavior are explicit and verified.

## Out of scope for the first implementation

- Translating every existing `ui` and `admin` component.
- Lazy-loading locale resources.
- Runtime-reactive replacement of package override configuration.
- Replacing Vue I18n with an alternative runtime.

## Open questions

- The persisted preference is authoritative after store hydration; the host Composer is not synchronized back into the store.
- The fallback defaults to `"en"` and is configurable through the package plugin. The same configured fallback governs local library message fallback and Naive UI locale selection unless an integration explicitly supplies a narrower mapping.
- Does JSON import inference survive the source-only declaration build and unplugin transformation strongly enough to derive exported override types without explicit interfaces?
