# fluent-vue / Project Fluent Research Notes

## Overview

`fluent-vue` is a Vue.js internationalization plugin that integrates Fluent.js (the JavaScript implementation of Mozilla's Project Fluent). It provides a small API surface — 2 methods (`$t`, `$ta`), 1 directive (`v-t`), 1 component (`i18n`) — with most localization complexity handled declaratively through Fluent's `.ftl` syntax rather than programmatic logic.

- **Package**: `fluent-vue` (v3.8.2), MIT license, ~5.7K weekly downloads [npm]
- **Author**: Ivan Demchuk (demivan), under `fluent-vue` GitHub org
- **Repository**: https://github.com/fluent-vue/fluent-vue (monorepo with pnpm workspaces)
- **Docs**: https://fluent-vue.demivan.me (VitePress, built from `fluent-vue/docs` repo)
- **Core runtime**: `@fluent/bundle` (peer dep, >=0.17.0, currently 0.19.1), `@fluent/sequence` ^0.8.0 [package.json]

## Maintenance & Current Compatibility

**Actively maintained.** Recent releases show ongoing Vue 3 + SSR work:
- v3.8.0 (2025-11-16): Bug fixes for i18n translations inside slots, custom variable types support; breaking change for i18n slot behavior [CHANGELOG]
- v3.7.x series (2025): Vue 3 type augmentation, SSR compatibility, devtools integration
- Renovate bot actively updating deps through June 2026 [GitHub commits]

**Vue 3 required**: Published 3.8.2 peerDependencies are `vue: "^2.6.11 || >=3.2.45"` (Vue 2 legacy peers still declared), while the main-branch package.json shows `vue: ">=3.2.45"` — the docs state Vue 2 is no longer supported and v3 is the last Vue 2 compatible release. [npm registry metadata, package.json, installation docs]

**Vue-Demi**: Published 3.8.2 still ships `vue-demi: latest` as a runtime dependency plus `@vue/composition-api` peer (Vue 2 compat shim), but the main-branch package.json has dropped both — i.e. Vue 2 legacy support is being removed in the next release. [npm registry metadata vs. main-branch package.json]

**Required Intl APIs**: `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.PluralRules` (may need `intl-pluralrules` polyfill for older engines). [installation docs]

## Resource Bundle Registration

### FluentBundle (from `@fluent/bundle`)

Each `FluentBundle` represents translations for a single locale:

```js
import { FluentBundle, FluentResource } from '@fluent/bundle'

const enBundle = new FluentBundle('en')
enBundle.addResource(new FluentResource('hello = Hello, {$name}!'))
```

- **Constructor**: `new FluentBundle(locales, options?)` — `locales` is a string or `string[]` (e.g. `["en-US", "en"]`) used to instantiate `Intl` formatters [@fluent/bundle source]
- **`addResource(res, { allowOverrides? })`**: Adds an `FluentResource` (parsed FTL). By default, attempting to add a duplicate message/term ID throws errors; `{ allowOverrides: true }` silently replaces. Returns array of errors. [@fluent/bundle source]
- **`hasMessage(id)` / `getMessage(id)`**: Check/retrieve raw message AST
- **`formatPattern(pattern, args, errors)`**: Format a message pattern to string

### FluentVue Instance

```js
import { createFluentVue } from 'fluent-vue'

const fluent = createFluentVue({
  bundles: [enBundle, ukBundle]  // ordered fallback chain
})
app.use(fluent)
```

- `bundles` is the **ordered, negotiated fallback chain** — first bundle that contains the key wins [installation docs]
- `bundles` is stored internally as `shallowRef` — reactive, triggers re-render on reassignment [index.ts]

### Per-Component Override (`fluent` option / SFC block)

Components can provide additional translations via the `<fluent>` SFC custom block (processed by `unplugin-fluent-vue`) or the `fluent` component option:

```vue
<fluent locale="en">
hello = Hello from component!
</fluent>
```

This creates a component-scoped `TranslationContext` where the component's messages are merged into cloned copies of the root bundles using `addResource(res, { allowOverrides: true })` [getContext.ts]. The key property is that component-level messages **override** matching keys from root bundles.

## Term/Message Overriding

### At FluentBundle level

`addResource(res, { allowOverrides: true })` allows overriding existing messages and terms. Without this flag, duplicate IDs produce errors. [@fluent/bundle source]

### At fluent-vue level

**`inheritBundle(locale, parent)`** — utility that copies a parent bundle's messages, terms, functions, and options into a new bundle. Used internally by `getMergedContext` for component-level overrides: clones root bundles, then adds component-specific resources with `allowOverrides: true`. [inheritBundle.ts]

**`mergedWith(extraTranslations?)`** method on `FluentVue` — programmatically creates a `TranslationContext` with additional translations merged on top of the root context. Same pattern as per-component override but callable outside components. [index.ts]

### Key insight for host/library layering

The override chain is:
1. **Host app** creates root bundles with default messages
2. **Library component** provides its own translations via `fluent` option or SFC block
3. Component-scoped context clones host bundles, then adds library messages with `allowOverrides: true`
4. Library messages **override** host messages for matching keys within that component's scope

There is **no built-in "host always wins" or "library always wins" policy** — the override behavior is fixed: library messages overlay host messages. To flip this, the host would need to provide library messages in the root bundle chain.

## Fallback Semantics

### Message resolution

`TranslationContext.format(key, args)`:
1. Calls `mapBundleSync(bundles, key)` from `@fluent/sequence` — walks the ordered bundle iterable, returns the first bundle containing `key` [@fluent/sequence README, TranslationContext.ts]
2. If no bundle has the key → returns the key string itself as fallback (with optional `warnMissing` callback) [TranslationContext.ts]
3. If bundle has the key → formats the message pattern with provided args

**`@fluent/sequence`**: `mapBundleSync(iterable, id)` iterates bundles synchronously, returning the first `FluentBundle` that has the message. The iterable should be wrapped in `CachedSyncIterable` (from `cached-iterable`) for repeated lookups without advancing/depleting the iterator. [@fluent/sequence README]

### No built-in locale negotiation

fluent-vue does **not** implement language negotiation (e.g. Accept-Language header parsing, `navigator.languages`). The bundle list order is entirely user-controlled. The user must:
1. Detect/negotiate the user's preferred locale
2. Build the bundle array in priority order
3. Assign it to `fluent.bundles`

### Message referencing in FTL

Fluent messages can reference other messages and terms internally:
- `{ message-id }` — references another message
- `{ -term-id }` — references a private term
- `{ -term-id.attribute }` — references a term's attribute

These cross-references resolve within the same bundle. If a referenced message/term is not found in the current bundle but exists in a fallback bundle, fluent-vue does **not** automatically resolve across bundles — the FluentBundle is self-contained.

## Host/Library Resource Layering

flent-vue supports the host-owns-runtime model through several mechanisms:

### Pattern A: Per-component `fluent` option

```vue
<!-- Library component -->
<script>
import en from './en.ftl'
export default {
  fluent: { en }
}
</script>
```

Component-scoped context copies root bundles, adds library FTL with `allowOverrides: true`. Library messages overlay host messages within that component's scope. [getContext.ts, getMergedContext]

### Pattern B: `mergedWith` API

```js
// Library setup
import libMessages from './messages.ftl'
const libContext = fluent.mergedWith({ en: libMessages })
// libContext.format() now has root + library messages
```

### Pattern C: Separate bundle entries

Host can pre-register library messages into specific bundles in the fallback chain:

```js
const hostBundle = new FluentBundle('en')
hostBundle.addResource(hostMessages)

const libBundle = new FluentBundle('en')
libBundle.addResource(libMessages)

// libBundle comes AFTER hostBundle — host messages take priority
createFluentVue({ bundles: [hostBundle, libBundle] })
```

This gives the host explicit control over which messages override which.

### Limitation

There's no built-in mechanism for the host to selectively **re-override** specific library messages back in the component scope. The `fluent` component option creates a closed override: library FTL → cloned host bundles. If the host wants to customize a library component's messages, it would need to either:
1. Modify the library's FTL files (build-time)
2. Provide a way to inject custom FTL into the library component at runtime
3. Use `mergedWith` through a prop/injection pattern

## Locale Switching

Locale switching is done by reassigning the `bundles` property:

```js
const fluent = createFluentVue({ bundles: [enBundle] })

// Switch to Ukrainian
fluent.bundles = [ukBundle]
```

- `bundles` is backed by `shallowRef` → reassignment triggers reactive re-render of all components consuming translations [index.ts]
- No built-in locale detection, persistence, or routing integration — entirely user-managed
- Nuxt example uses cookies + `fluent.bundles = [bundles[locale]]` [Nuxt integration docs]
- The `bundles` setter accepts any `Iterable<FluentBundle>`, enabling dynamic bundle generation

**Note**: The reactive update is shallow — only replacing the entire iterable triggers reactivity. Mutating an individual bundle's messages (e.g. `bundle.addResource(...)`) does **not** trigger re-render. Users must reassign the whole `bundles` property.

## SSR / Multi-App Safety

### Per-app instances

`createFluentVue()` creates an independent `FluentVue` instance each call. The plugin uses Vue's **`provide/inject`** pattern:

```js
// install method:
vue.provide(RootContextSymbol, rootContext)
```

This is **not a global singleton** — each Vue app gets its own context. Multiple apps on the same page (micro-frontends, multi-app setup) are safe. [index.ts]

`useFluent()` retrieves context via `inject(RootContextSymbol)` — standard Vue 3 composition API, scoped to the component's app instance. [composition.ts]

### SSR handling

`getContext()` includes explicit SSR awareness:

```js
const isServer = typeof window === 'undefined'
if (!fromSetup && !isServer)
  options._fluent = context  // cache on client, skip on server
```

On the server, per-component context caching is **disabled** to prevent cross-request pollution. Each render creates a fresh context. [getContext.ts]

### Nuxt 3 support

Official Nuxt 3 module via `unplugin-fluent-vue/nuxt`:
- Handles SFC `<fluent>` blocks (`SFCFluentPlugin`) and external `.ftl` files (`ExternalFluentPlugin`)
- Plugin is installed per-request via `nuxt.vueApp.use(fluent)` in `defineNuxtPlugin` [Nuxt integration docs]

### Context isolation summary

| Concern | Safe? | Mechanism |
|---------|-------|-----------|
| Multiple Vue apps on same page | Yes | `provide/inject` per app |
| SSR cross-request pollution | Yes | No context caching on server |
| Concurrent SSR renders | Yes | Fresh `TranslationContext` each render |
| Global state leakage | Yes | No global singletons, all state in Vue reactivity tree |

## TypeScript Support

- **Built with TypeScript**: `tsc --noEmit` in CI, `tsdown` for build [package.json]
- **Types exported**: `dist/index.d.mts` (ESM), `dist/index.d.cts` (CJS) — declared in `exports` field [package.json]
- **`FluentVueOptions`**: Typed configuration for `createFluentVue()` including `bundles`, `globals`, `warnMissing`, `parseMarkup`, `mapVariable`, `componentTag` [types from options.ts]
- **`FluentVue` interface**: Typed return of `createFluentVue()` with `bundles`, `format`, `formatAttrs`, `formatWithAttrs`, `mergedWith`, `$t`, `$ta`, `install` [index.ts]
- **`TypesConfig`**: Interface for extending custom variable types supported by format functions — use module augmentation [index.ts]
- **Vue type augmentation**: `v-t` directive and `$t`/`$ta` properties typed on component instances; Volar support via `./types/volar` import [index.ts]
- **`@fluent/bundle` types**: `FluentBundle`, `FluentResource`, `FluentVariable`, `Message`, `Pattern` — all fully typed [@fluent/bundle source]

## Library Distribution

### Package exports

```json
{
  "type": "module",
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.mts", "default": "./dist/index.mjs" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    }
  },
  "main": "dist/index.mjs",
  "unpkg": "dist/index.iife.js",
  "sideEffects": false
}
```

- ESM + CJS dual format with separate type declarations
- IIFE build for CDN (unpkg/jsdelivr)
- `sideEffects: false` — tree-shakeable

### Dependency footprint

| Dependency | Version | Role |
|-----------|---------|------|
| `@fluent/bundle` | >=0.17.0 (peer) | **Required user install.** Core Fluent runtime: bundle, resource, formatting (13.2KB gzipped) |
| `@fluent/sequence` | ^0.8.0 | Bundle iteration and message lookup (`mapBundleSync`) (0.9KB gzipped) |
| `cached-iterable` | ^0.3.0 | Wraps bundle iterables for repeated lookups |
| `@vue/devtools-api` | ^8.0.0 | Vue DevTools integration (dev-time only) |
| `vue-demi` | latest (published 3.8.2 only) | Vue 2/3 compatibility shim; dropped on main branch |

**Measured runtime weight** (gzipped, production ESM builds from npm tarballs, measured 2026-07-31): fluent-vue `dist/prod/index.mjs` 2.9KB + `@fluent/bundle` esm total 13.2KB + `@fluent/sequence` esm total 0.9KB ≈ **17KB gzipped** before tree-shaking. `@vue/devtools-api` is devtools-only and tree-shakeable; `cached-iterable` adds a few hundred bytes.

### Consumer setup

A library consumer must:
1. Install `fluent-vue` and `@fluent/bundle` (peer dep)
2. Create `FluentBundle` instances for each locale
3. Create `FluentVue` instance via `createFluentVue()`
4. Install on Vue app via `app.use(fluent)`

A **library package** shipping its own messages would:
1. Ship `.ftl` files as raw strings or pre-parsed `FluentResource` objects
2. Have host register them in bundles via `addResource()`
3. Alternatively, components can use the `fluent` option for self-contained messages

## Verdict

**Criterion-by-criterion assessment for the library i18n integration task:**

| Criterion | Status | Notes |
|-----------|--------|-------|
| Host owns one localization runtime | ✅ | `createFluentVue()` creates a single app-level instance; library components consume via `provide/inject` |
| Library ships default messages | ✅ | Via `fluent` SFC blocks or external `.ftl` files imported as `FluentResource` |
| Host can partially override defaults | ✅ | Multiple patterns: bundle ordering, per-component `fluent` option, `mergedWith` API |
| Package locale follows host | ✅ | Components read locale from injected context; no independent locale state |
| SSR/multi-app safety | ✅ | Per-app `provide/inject`, no global singletons, explicit server-side context isolation |
| TypeScript | ✅ | Full TS support throughout the stack |
| No mandatory SaaS | ✅ | 100% open-source, no external service dependencies |

**Unique advantages of fluent-vue for this use case:**
1. **`inheritBundle` + `allowOverrides`**: The cloning-and-overlay pattern is purpose-built for the host/library layering model — it's not a hack, it's the designed mechanism
2. **Declarative FTL syntax**: Complex localization logic (plurals, genders, selectors) lives in `.ftl` files, not in component code — reduces the API surface library authors need to expose
3. **`mergedWith` escape hatch**: For cases where the per-component `fluent` option is insufficient, `mergedWith` provides programmatic context merging
4. **`mapBundleSync` fallback chain**: The ordered-bundle model maps cleanly to "host messages → library defaults → key-as-fallback"

**Notable gaps/risks:**
1. **No built-in "host overrides library" at component scope**: The per-component `fluent` option *always* overlays library messages ON TOP of host messages. To let the host override library defaults, the host must control the bundle registration order at the app level (Pattern C above), which is coarser-grained than per-component
2. **Bundle-level granularity only**: There's no built-in message-level "who can override what" — it's bundle-order-based. Fine-grained host overrides of library messages require custom patterns
3. **`vue-demi` still in the published release**: 3.8.2 ships `vue-demi` + `@vue/composition-api` peers as Vue 2 legacy compat, though both are already dropped on main — resolves in the next release
4. **Smaller community**: ~5.7K weekly downloads vs. vue-i18n's ~1.4M — fewer community resources, examples, and third-party tooling
5. **Single maintainer**: Ivan Demchuk is the sole maintainer — bus factor risk

## Sources

- [fluent-vue npm](https://www.npmjs.com/package/fluent-vue) — package metadata, versions, dependencies
- [npm registry API: fluent-vue latest](https://registry.npmjs.org/fluent-vue/latest) — published 3.8.2 dependencies/peerDependencies (vue-demi, @vue/composition-api)
- [npm registry API: @fluent/bundle latest](https://registry.npmjs.org/@fluent/bundle/latest) — published version, tarball for size measurement
- [npm registry API: @fluent/sequence latest](https://registry.npmjs.org/@fluent/sequence/latest) — published version, tarball for size measurement
- [fluent-vue GitHub repo](https://github.com/fluent-vue/fluent-vue) — source code, README, monorepo structure
- [fluent-vue docs](https://fluent-vue.demivan.me) — installation, API, how-to guides, Nuxt integration
- [fluent-vue docs repo](https://github.com/fluent-vue/docs) — VitePress config, sidebar structure
- [fluent-vue src/index.ts](https://raw.githubusercontent.com/fluent-vue/fluent-vue/main/packages/fluent-vue/src/index.ts) — `createFluentVue`, `FluentVue` interface, plugin install
- [fluent-vue src/TranslationContext.ts](https://raw.githubusercontent.com/fluent-vue/fluent-vue/main/packages/fluent-vue/src/TranslationContext.ts) — `format`, `formatAttrs`, message resolution
- [fluent-vue src/getContext.ts](https://raw.githubusercontent.com/fluent-vue/fluent-vue/main/packages/fluent-vue/src/getContext.ts) — `getContext`, `getMergedContext`, SSR detection
- [fluent-vue src/inheritBundle.ts](https://raw.githubusercontent.com/fluent-vue/fluent-vue/main/packages/fluent-vue/src/inheritBundle.ts) — bundle cloning for component overrides
- [fluent-vue src/composition.ts](https://raw.githubusercontent.com/fluent-vue/fluent-vue/main/packages/fluent-vue/src/composition.ts) — `useFluent` composable
- [fluent-vue src/util/options.ts](https://raw.githubusercontent.com/fluent-vue/fluent-vue/main/packages/fluent-vue/src/util/options.ts) — option resolution, defaults
- [fluent-vue package.json](https://raw.githubusercontent.com/fluent-vue/fluent-vue/main/packages/fluent-vue/package.json) — exports, peer deps, dependencies, scripts
- [fluent-vue CHANGELOG](https://raw.githubusercontent.com/fluent-vue/fluent-vue/main/CHANGELOG.md) — release history, maintenance activity
- [@fluent/bundle npm](https://www.npmjs.com/package/@fluent/bundle) — version (0.19.1), ~79K weekly
- [@fluent/bundle README](https://raw.githubusercontent.com/projectfluent/fluent.js/main/fluent-bundle/README.md) — basic usage, compatibility
- [@fluent/bundle source (bundle.ts)](https://raw.githubusercontent.com/projectfluent/fluent.js/main/fluent-bundle/src/bundle.ts) — `FluentBundle` class, `addResource` with `allowOverrides`, `formatPattern`
- [@fluent/sequence npm](https://www.npmjs.com/package/@fluent/sequence) — version (0.8.0), ~30K weekly
- [@fluent/sequence README](https://raw.githubusercontent.com/projectfluent/fluent.js/main/fluent-sequence/README.md) — `mapBundleSync`, `mapBundleAsync`, `CachedSyncIterable`
- [Project Fluent Syntax Guide](https://projectfluent.org/fluent/guide/) — FTL syntax reference
- [fluent-vue Nuxt integration docs](https://fluent-vue.demivan.me/integrations/nuxt) — SSR setup, cookie-based locale
- [fluent-vue unplugin docs](https://fluent-vue.demivan.me/integrations/unplugin) — `SFCFluentPlugin`, `ExternalFluentPlugin`
