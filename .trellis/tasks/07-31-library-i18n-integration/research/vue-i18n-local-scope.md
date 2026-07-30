# Vue I18n local-scope architecture

**Research date:** 2026-07-31

## Candidate

Each translating library component creates a local Composer containing package/component defaults merged with optional package-specific host overrides:

```ts
const overrides = inject(adminI18nOverridesKey, {})
const messages = deepMerge(adminDefaultMessages, overrides)

const { t } = useI18n({
  useScope: "local",
  inheritLocale: true,
  fallbackRoot: false,
  messages,
})
```

The host still creates and installs one global Vue I18n instance. Local Composers inherit its active locale by default, so normal global locale changes update local scopes automatically. They do not share message registries, eliminating cross-library key collisions.

## Confirmed Vue I18n behavior

- Explicit `useScope: "local"` creates a new Composer for the calling component with the supplied messages and formats.
- Local scopes inherit the global locale by default; global locale changes automatically update inherited local locales. `inheritLocale: false` disables this.
- Local message lookup can fall back to the root/global Composer by default. `fallbackRoot: false` prevents package text from accidentally resolving through host-global messages and preserves registry isolation.
- The host must still install the global Vue I18n plugin; local scope is not a hidden independent application runtime.

Primary sources:

- [Vue I18n Composition API: local scope](https://vue-i18n.intlify.dev/guide/advanced/composition#local-scope)
- [Vue I18n Composition API reference: Composer options](https://vue-i18n.intlify.dev/api/composition)

## Override transport

Local scope makes package-specific override channels meaningful because each package owns an independent message registry.

### Optional package plugin

```ts
app.use(adminI18nOverridesPlugin, {
  messages: {
    en: {
      signOut: "Log out",
    },
  },
})
```

The plugin provides app-scoped overrides under an Admin-owned injection key. Components use defaults when the plugin is absent, retaining zero package-specific setup. `ui` can expose its own optional plugin/key without requiring a global message namespace.

The plugin should precompose effective package messages once at installation where practical:

```ts
install(app, options = {}) {
  app.provide(
    adminMessagesKey,
    deepMerge(adminDefaultMessages, options.messages ?? {}),
  )
}
```

Components inject the effective messages, falling back to package defaults when the plugin was not installed.

### Properties

- Overrides are application/request-scoped through Vue provide/inject.
- No process-global mutable registry.
- Host overrides are static startup configuration unless the API deliberately accepts reactive message resources.
- Override precedence is deterministic: `package defaults < package plugin overrides`.
- Installing only the global Vue I18n plugin renders package defaults; package override plugins are optional.

## Collision behavior

`ui` and `admin` may reuse the same message key because their local Composers never merge message registries. The override configuration is separated by package plugin/key rather than by adding wrapper namespaces inside message keys.

Within one local Composer, duplicate ownership remains invalid. A package must still define one authoritative value for each key in the messages supplied to a component.

Setting `fallbackRoot: false` is important if collision isolation is the goal. With root fallback enabled, a missing local key can resolve from the host-global catalog, reintroducing an implicit dependency on global keys.

## Locale ownership

`inheritLocale: true` solves host-to-library synchronization automatically:

```text
global Composer locale -> local Composer locale
```

Changing a local Composer locale does not establish global ownership. `AdminShell` preferences that control the whole Admin application must update the global Composer separately. `AdminShell` can obtain both:

```ts
const local = useI18n({
  useScope: "local",
  inheritLocale: true,
  fallbackRoot: false,
  messages,
})

const global = useI18n({ useScope: "global" })
```

The local Composer translates AdminShell text; the global Composer receives application-wide locale changes. The Composer remains outside serializable Pinia state.

## Granularity options

### Package-wide messages in every local Composer

Every translating component receives the complete package catalog.

Advantages:

- One package message schema and override payload.
- Shared package keys behave consistently.
- Simple host configuration.

Costs:

- Each component instance creates a Composer initialized with the full package catalog.
- Message objects and compiled formats may be repeatedly processed.
- A large UI library pays unnecessary per-component setup for unrelated strings.

### Component-specific local messages

Each component supplies only its own message slice, while the package plugin provides a package-shaped override object from which the component selects its slice.

Advantages:

- Small local Composer resources.
- Strong ownership: a component owns exactly its text.
- Better bundle splitting when component modules import only their locale files.

Costs:

- More message files/schema fragments.
- Shared labels require an explicit shared slice or duplication.
- Host override paths must remain stable across component refactors.

### One parent local Composer for a package subtree

A package root such as `AdminShell` creates a local Composer; descendants use `useScope: "parent"`.

Advantages:

- One Composer and one package catalog per shell instance.
- Natural for Admin components guaranteed to live under AdminShell.

Costs:

- Standalone components need a fallback/local Composer path.
- UI primitives can appear outside any package root.
- Translation behavior depends on component placement.
- Parent-scope lookup can bind to an unrelated local Composer in composed host trees unless package boundaries are carefully enforced.


## Catalog file granularity and bundling

Splitting `en.yaml` into `en/MyComponent1.yaml`, `en/MyComponent2.yaml`, and similar files does not reduce the package's total locale bytes. It only creates finer static module boundaries. A consuming bundler can benefit when an unused component and its uniquely imported locale module are both tree-shaken or code-split; a monolithic catalog imported by any retained component generally keeps the whole catalog reachable. The benefit therefore depends on modular component imports, side-effect-free ESM output, and the consumer's bundler.

The current libraries build from one public entry and do not preserve one output module per source file. Rollup can still emit tree-shakable ESM declarations, but splitting YAML files alone does not guarantee a smaller consumer bundle. It gives little benefit for `AdminShell`, whose related components and text are normally consumed together. It may become useful for a broad `ui` package when consumers routinely retain only a small subset of translated components.

Local Composer lookup complexity is not materially improved by smaller catalogs, but Composer initialization and merge work are. With precompiled locale resources, the per-instance merge traversal is proportional to the supplied resource tree, so broad package catalogs can become expensive in a mount-heavy UI library.

For a monolithic package catalog, no custom deep merge is required. Create the local Composer without passing the imported module-level defaults, then merge defaults followed by package overrides for each locale:

```ts
const composer = useI18n({
  useScope: "local",
  inheritLocale: true,
  fallbackRoot: false,
})

for (const [locale, messages] of Object.entries(defaultMessages)) {
  composer.mergeLocaleMessage(locale, messages)
}

for (const [locale, messages] of Object.entries(overrides)) {
  composer.mergeLocaleMessage(locale, messages)
}
```

The two-stage merge is safer than passing imported defaults through `useI18n({ messages: defaultMessages })` and then merging overrides. Vue I18n's `getLocaleMessages()` retains the supplied plain `messages` object rather than cloning it, so a later `mergeLocaleMessage()` can mutate module-level defaults and leak overrides across components, Vue apps, tests, or SSR requests. Starting with an empty local Composer gives each instance a fresh registry; `mergeLocaleMessage()` reads defaults and overrides as sources without mutating them.

Overrides merge last and therefore win without a custom deep-merge helper. This also removes the need to filter override keys per component when the local Composer represents the whole package catalog. The trade-off is that every translating component-local Composer receives the full package defaults and override tree. Start with one catalog per package and locale; split by component only if bundle analysis demonstrates meaningful unused locale retention in selective `ui` imports.

## SSR and multiple applications

The provider-plugin variant is naturally app/request-scoped if each SSR request creates its own Vue app and global i18n instance. Local Composers are created during component setup and disposed with their component instances. Avoid module-global override registration or caching merged overrides across applications.
For a small package, one catalog per package and locale remains the simplest baseline. For `ui`/`admin` packages with many translated components, prefer component-level locale slices once the override schema provides an efficient component selection mechanism. This is a runtime-performance decision as well as a bundle-boundary decision.

## Merge-cost correction

Package-wide catalogs repeat the full deep merge for every translating component instance. If `N` component instances each receive `M` package message leaves, setup work approaches `O(N × M)` before considering locale count and override traversal. Per-component catalogs reduce this toward the sum of each instance's own message leaves, `O(Σ instanceMessageCount)`, and can materially improve mount-heavy UI packages.

Therefore, per-component locale files are not only a bundling optimization. They can reduce local Composer initialization and merge work. The override provider should expose a component-addressable override tree or each component should select its own slice; otherwise every component still traverses the complete override tree even if its defaults are split.

The recommended shape becomes:

```ts
const defaults = {
  en: componentMessages,
}
const overrides = inject(adminOverrideMessagesKey, {})
const componentOverrides = selectComponentOverrides(
  overrides,
  "MyComponent",
)
const composer = useI18n({
  useScope: "local",
  inheritLocale: true,
  fallbackRoot: false,
})

for (const [locale, messages] of Object.entries(defaults)) {
  composer.mergeLocaleMessage(locale, messages)
}
for (const [locale, messages] of Object.entries(componentOverrides)) {
  composer.mergeLocaleMessage(locale, messages)
}
```

This requires deciding whether the override schema uses stable component identifiers, typed component registration functions, or a package-level flat shape filtered against component defaults. The first two avoid scanning unrelated override keys; the last keeps host configuration flatter but retains filtering work.
Hydration requires identical plugin overrides and locale initialization on server and client. The global locale should be settled before rendering so inherited local scopes start consistently.

## Assessment

This is a credible architecture and is cleaner than global-scope registration when collision isolation and zero package-specific setup matter most. It trades one global message registry for multiple component-local Composers and makes the optional package override plugin—not `createI18n({ messages })`—the authoritative customization channel.

Recommended defaults for a prototype:

```ts
useI18n({
  useScope: "local",
  inheritLocale: true,
  fallbackRoot: false,
  messages: effectiveComponentMessages,
})
```

Prototype both package-wide and component-slice message granularity and measure Composer/setup cost before settling the public override schema.
