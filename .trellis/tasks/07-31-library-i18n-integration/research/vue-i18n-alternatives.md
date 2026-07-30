# Vue i18n alternatives for reusable component libraries

**Research date:** 2026-07-31

## Question

Which current i18n libraries with Vue 3 support can satisfy this architecture?

- The host owns one application/request-scoped localization runtime.
- `@noob-naive-ui/ui` and `@noob-naive-ui/admin` ship default messages.
- Hosts can partially override package defaults at runtime.
- Package messages follow the host locale reactively.
- The design remains safe for SSR and multiple Vue applications.

## Summary

| Candidate | Vue 3 integration | Runtime message layering | Host-over-library overrides | SSR/multi-app isolation | Assessment |
|---|---|---:|---:|---:|---|
| i18next + i18next-vue | Official ecosystem integration | Excellent | Explicit `deep`/`overwrite` controls | Good with `createInstance()` per app/request | Strongest alternative |
| fluent-vue + Project Fluent | Native Vue plugin | Strong bundle/resource layering | Possible through ordered bundles or explicit resource composition | Strong per-app provide/inject design | Promising, syntax/runtime trade-offs |
| Tolgee Vue | Official Vue SDK | Runtime static data and namespaces | Possible, but precedence needs a prototype | Per-app provided instance; documented SSR support | Viable but heavier/product-oriented |
| Paraglide JS | Official Vue integration | Compile-time only | No official runtime override of compiled library messages | Good locale runtime isolation | Poor fit for runtime overrides |
| Lingui | No published official Vue runtime | Core catalogs are mutable | Core could support it, Vue binding cannot | Not assessable as a supported Vue stack | Not currently viable |
| typesafe-i18n | Vue adapter | Compiler-first generated functions | No supported runtime library-message override model | Adapter exists | Poor fit, same limitation class as Paraglide |
| Intlayer | Native Vue plus Vue-I18n compatibility | Content declarations; compatibility path delegates to Vue I18n | Possible, but compatibility mode inherits Vue I18n semantics | Framework integrations exist | Adds machinery without solving the core problem differently |

## 1. i18next with i18next-vue

### Why it fits

i18next is runtime-first. Its resource store exposes the exact precedence operation needed by reusable libraries:

```ts
instance.addResourceBundle(
  locale,
  "noob-admin",
  adminDefaults,
  true,  // deep merge
  false, // preserve existing host values
)
```

The fifth argument directly controls whether incoming values overwrite existing values. This means host overrides can be registered first and package defaults can later fill missing keys without replacing them. Unlike Vue I18n's global-scope component message registration, no custom defaults-under-existing deep merge is needed.

Alternatively, libraries can register defaults first and hosts can register overrides later with `overwrite: true`.

i18next namespaces are first-class rather than merely key prefixes:

```ts
useTranslation("noob-admin")
useTranslation("noob-ui")
```

The host creates an isolated instance and gives it to the Vue plugin:

```ts
const i18n = i18next.createInstance()
await i18n.init({ /* host options */ })
app.use(I18NextVue, { i18next: i18n })
```

Each SSR request or Vue app can receive a separate instance. `i18next-vue` reacts to language and resource-store events, including `languageChanged`, `loaded`, `added`, and `removed`.

### Candidate library contract

```ts
export function registerAdminMessages(instance: i18n): void {
  for (const [locale, defaults] of Object.entries(adminMessages)) {
    instance.addResourceBundle(
      locale,
      "noob-admin",
      defaults,
      true,
      false,
    )
  }
}
```

This preserves messages already registered by the host. A host can also register later overrides explicitly:

```ts
instance.addResourceBundle(
  "en",
  "noob-admin",
  hostOverrides,
  true,
  true,
)
```

### Costs

- The host still must install and initialize i18next-vue.
- Library defaults must be registered against the host instance, either explicitly at startup or lazily from components.
- Translation catalogs are runtime data and are not tree-shaken by message key.
- Typed keys use global TypeScript module augmentation; independent library schemas and multiple instances make typing more awkward.
- `i18next-vue` is smaller and less Vue-opinionated than Vue I18n, but i18next itself has a broad API/plugin ecosystem.

### Assessment

**Strongest technical alternative.** Its `addResourceBundle(..., deep, overwrite)` API directly models package-default filling and host override precedence.

Primary sources:

- [i18next resource loading](https://www.i18next.com/how-to/add-or-load-translations)
- [i18next API](https://www.i18next.com/overview/api)
- [i18next namespaces](https://www.i18next.com/principles/namespaces)
- [i18next instance APIs](https://www.i18next.com/overview/api#createinstance)
- [i18next ResourceStore source](https://github.com/i18next/i18next/blob/master/src/ResourceStore.js)
- [i18next-vue getting started](https://i18next.github.io/i18next-vue/guide/started.html)
- [i18next-vue Composition API](https://i18next.github.io/i18next-vue/guide/composition-api.html)
- [Detailed project note](./i18next-vue.md)

## 2. fluent-vue with Project Fluent

### Why it is promising

Project Fluent uses locale-specific `FluentBundle` objects containing parsed FTL resources. Duplicate message IDs are explicit:

```ts
bundle.addResource(resource, {
  allowOverrides: true,
})
```

`fluent-vue` resolves messages through an ordered bundle chain: the first bundle containing a message wins. That naturally supports host-before-library layering:

```ts
createFluentVue({
  bundles: [hostEnglishBundle, libraryEnglishBundle],
})
```

A host bundle can contain only overridden keys while a later package bundle supplies the remaining defaults.

`createFluentVue()` creates an independent instance and installs an app-scoped provide/inject context. Its implementation avoids component-context caching on the server, making its ownership model attractive for SSR and multiple apps.

Fluent's FTL syntax is more expressive than ordinary JSON/YAML for grammatical variants, selectors, terms, and attributes.

### Important caveats

`fluent-vue`'s component-local `<fluent>` resources have the opposite default precedence: component resources are added over cloned root bundles with `allowOverrides: true`. A library that embeds defaults in component-local blocks would overwrite host root messages.

To preserve host precedence, packages should expose or register separate fallback bundles at application setup rather than embed colliding local resources in every component.

Locale switching is performed by replacing the reactive ordered bundle list. The host must own locale negotiation and construct the correct bundle chain. Mutating an existing `FluentBundle` does not itself trigger a Vue rerender; the bundle iterable must be reassigned.

Additional costs:

- FTL introduces a new translation syntax and resource-build path.
- Fluent message references resolve within a bundle, so splitting partial host overrides and defaults across bundles can constrain cross-message references.
- Smaller Vue ecosystem and maintainer base than Vue I18n/i18next.
- Published `fluent-vue` currently retains some Vue 2 compatibility dependencies, although the main branch is removing them.
- Message-key typing is not as strong as generated compiler-first systems.

### Assessment

**Promising if Fluent's linguistic model is desired.** Its ordered bundle chain gives a clean host-over-library fallback model, but it changes authoring syntax and shifts locale switching toward explicit bundle management.

Primary sources:

- [fluent-vue repository](https://github.com/fluent-vue/fluent-vue)
- [fluent-vue documentation](https://fluent-vue.demivan.me)
- [Project Fluent guide](https://projectfluent.org/fluent/guide/)
- [FluentBundle source](https://github.com/projectfluent/fluent.js/blob/main/fluent-bundle/src/bundle.ts)
- [@fluent/sequence documentation](https://github.com/projectfluent/fluent.js/blob/main/fluent-sequence/README.md)
- [Detailed project note](./fluent-vue.md)

## 3. Tolgee Vue

Tolgee has a host-provided Vue instance, namespaces, reactive locale switching, SSR documentation, and runtime static-data registration:

```ts
tolgee.addStaticData({
  "en:admin": adminDefaults,
})
```

It can run completely offline using static data; the hosted Tolgee platform is optional. This makes it more than a SaaS-only candidate.

The unresolved issue is precedence. Official documentation describes static-data fallback ordering and `addStaticData()`, but does not clearly specify all collisions between initialization `staticData`, later `addStaticData()` calls, loaded development data, and backends. A prototype is required before relying on library defaults preserving host values.

Tolgee also includes concerns beyond the current need: in-context editing, backend/CDN loading, platform integration, and development tooling. Typed keys use one global module augmentation, which is awkward across independently typed packages.

### Assessment

**Viable but not preferred.** Consider it if in-context localization management is a desired product feature. For a local reusable-library override mechanism alone, it is heavier and less precedence-explicit than i18next.

Primary sources:

- [Tolgee Vue installation](https://docs.tolgee.io/js-sdk/integrations/vue/installation)
- [Tolgee namespaces](https://docs.tolgee.io/js-sdk/namespaces)
- [Tolgee static data](https://docs.tolgee.io/js-sdk/providing-static-data)
- [Tolgee without its platform](https://docs.tolgee.io/js-sdk/usage-without-platform)
- [Tolgee SSR](https://docs.tolgee.io/js-sdk/integrations/vue/ssr)
- [Detailed project note](./tolgee-vue.md)

## 4. Other candidates

### Lingui

Lingui's core runtime supports loading and activating mutable catalogs, which is conceptually compatible. However, there is currently no published official `@lingui/vue` runtime package; current official framework integrations target React and React Native. A draft Vue binding is not a stable library contract.

**Assessment:** revisit only after official Vue runtime support ships.

### typesafe-i18n

`typesafe-i18n` has a Vue adapter and excellent generated types, but translations compile into generated functions. Dictionary extension is a generation-time mechanism rather than an application-scoped runtime override registry.

**Assessment:** same fundamental mismatch as Paraglide for independently compiled defaults plus host runtime overrides.

### Intlayer

Intlayer supports Vue content declarations and also offers a Vue-I18n compatibility adapter. The compatibility path delegates resource merging to Vue I18n, so it inherits rather than eliminates the precedence problem under investigation. Its content/CMS-oriented build model adds another integration layer.

**Assessment:** no clear advantage for this task unless Intlayer's broader content-management features are independently desired.

### Lightweight/early-stage Vue libraries

The surveyed lightweight packages either lacked deep resource layering/namespaces, were abandoned, or wrapped i18next. They would require custom merge and runtime-isolation infrastructure without providing a stronger ecosystem contract.

Primary-source inventory and status details: [ecosystem scan](./vue-i18n-ecosystem-scan.md).

## Recommendation

Prototype **i18next + i18next-vue** against the exact library contract before selecting a replacement. It is the only researched alternative whose official runtime API directly expresses:

```text
register defaults deeply without overwriting existing host values
```

Prototype **fluent-vue** only if adopting Fluent/FTL is acceptable for translators and maintainers; its ordered bundle chain is architecturally elegant, but the migration is broader than changing a Vue composable.

Keep Vue I18n as the baseline. Its problem is not inability to support overrides; it is that component-time global message registration has inconvenient incoming-wins precedence. A small explicit registration/provider contract may still cost less than replacing the runtime, message syntax, tooling, types, tests, and host integration.

## Suggested proof-of-concept checks

For i18next:

1. Host registers one overridden `noob-admin` key before mounting.
2. Library registers all defaults with `deep: true, overwrite: false`.
3. The host key survives and untranslated sibling defaults render.
4. Changing language rerenders `AdminShell` and host content.
5. Two independent Vue apps use different instances without resource leakage.
6. Two SSR requests use distinct instances without locale or message leakage.
7. Determine whether package-owned key typing can coexist without forcing consumers to maintain one global schema.

For fluent-vue:

1. Build one host partial-override bundle and one package-default bundle per locale.
2. Place host before package in the ordered bundle chain.
3. Verify overridden keys resolve from host and missing siblings fall through to package defaults.
4. Verify FTL references/terms behave correctly when overrides and defaults are in different bundles.
5. Replace locale bundle chains and confirm reactive rerendering.
6. Verify server rendering and hydration with one FluentVue instance per request.
