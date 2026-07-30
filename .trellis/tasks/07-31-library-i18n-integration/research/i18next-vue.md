# i18next + i18next-vue: Capability Assessment for Library i18n

**Research date:** 2026-07-31
**Scope:** Can reusable Vue component libraries (`@noob-naive-ui/ui`, `@noob-naive-ui/admin`) ship default translations via i18next and let a consuming host override specific messages at runtime using the official i18next-vue Vue 3 integration?

## Executive Summary

**i18next with i18next-vue is well-suited for the "library ships defaults, host overrides at runtime" pattern.** i18next is a runtime-first i18n library with JSON-based message catalogs, a rich resource registration API (`addResourceBundle` with deep merge and overwrite control), namespace-based isolation, and first-class support for independent instances via `createInstance`. The official i18next-vue integration provides Vue 3 composition API access (`useTranslation`), reactive locale switching, and lazy-loaded namespaces. The architecture maps cleanly to the PRD's requirements: library defaults enter the shared i18next instance via `addResourceBundle`, host overrides can be merged before or after registration, namespaces isolate `ui` from `admin`, and per-application instances guarantee SSR safety.

Key trade-offs compared to Vue I18n: i18next has no built-in "composer" abstraction or component-scoped message inheritance; all messages live in a flat namespace-key tree on the i18next instance. Override precedence must be managed at registration time (order of `addResourceBundle` calls or pre-merge), not through a component-level `useI18n({ messages })` call. TypeScript key typing requires module augmentation and is challenging across multiple independent packages.

---

## 1. Runtime Architecture

i18next is a **runtime-first** i18n library. It does not compile translations. Instead:

1. Messages are authored as JSON objects organized by language → namespace → key hierarchy [1].
2. Messages can be loaded at init via the `resources` option, added after init via `addResourceBundle`, or lazy-loaded via backend plugins [1][2].
3. The `t()` function resolves keys at runtime against the current language's resource store, with fallback chain resolution [1].
4. There is no build step; message content is never baked into compiled functions.

**This means message content is fully mutable at runtime.** Libraries can ship JSON message objects and register them on the shared i18next instance before or after the host's own registration.

**Sources:**
- [1] i18next Getting Started: https://www.i18next.com/overview/getting-started — shows `resources` object and `t()` usage.
- [2] i18next Add or Load Translations: https://www.i18next.com/how-to/add-or-load-translations — documents `addResourceBundle` after init.

---

## 2. Namespace Architecture

Namespaces are i18next's primary isolation mechanism [3]:

- Messages are organized as `{ lng: { namespace: { key: value } } }`.
- The `ns` option declares which namespaces the instance knows about.
- `defaultNS` sets the default namespace for `t()` calls without explicit namespace.
- Namespaces can be loaded lazily via `loadNamespaces()` or backend plugins [3].
- Key access across namespaces uses `ns:key` syntax or the `{ ns: 'name' }` option.

**For library isolation**, `ui` and `admin` would each own a namespace (e.g., `noob-ui`, `noob-admin`), registered independently on the shared i18next instance. Components use `useTranslation('noob-ui')` or `getFixedT(null, 'noob-ui')` to scope lookups. Namespace collisions are impossible by construction since namespace names are explicitly declared.

**Sources:**
- [3] i18next Namespaces: https://www.i18next.com/principles/namespaces

---

## 3. Resource Registration and Merge APIs

### `addResourceBundle(lng, ns, resources, deep, overwrite)`

This is the primary API for runtime message registration [4]:

```javascript
// Add default messages — deep merge, don't overwrite existing keys
i18next.addResourceBundle('en', 'noob-ui', { signOut: 'Sign out' }, true, false);

// Add overrides — deep merge, overwrite existing keys
i18next.addResourceBundle('en', 'noob-ui', { signOut: 'Log out' }, true, true);
```

Parameters [4]:
- `lng`: language code (e.g., `'en'`)
- `ns`: namespace name (e.g., `'noob-ui'`)
- `resources`: flat or nested key-value object
- `deep`: if `true`, performs deep (recursive) merge; if `false`, shallow Object.assign at top level
- `overwrite`: if `true`, existing keys are overwritten; if `false`, existing keys are preserved (first-write-wins)

**Critical for override precedence:** The `deep` and `overwrite` flags control merge behavior directly. The ResourceStore source confirms [5]:

```javascript
// From ResourceStore.js (lines ~175-190)
addResourceBundle(lng, ns, resources, deep, overwrite, options) {
  let pack = getPath(this.data, path) || {};
  if (deep) {
    deepExtend(pack, resources, overwrite);
  } else {
    pack = { ...pack, ...resources };
  }
  setPath(this.data, path, pack);
}
```

`deepExtend` traverses nested objects and either overwrites or preserves based on the `overwrite` flag.

### Order-dependent override patterns

Two registration strategies satisfy the PRD's precedence requirement:

**Strategy A — Host registers overrides first (overwrite: true), library registers defaults later (overwrite: false):**
```ts
// 1. Host registers overrides
i18next.addResourceBundle('en', 'noob-ui', hostOverrides, true, true);
// 2. Library registers defaults — existing keys (host overrides) are NOT overwritten
i18next.addResourceBundle('en', 'noob-ui', libraryDefaults, true, false);
// Result: hostOverrides win over libraryDefaults for colliding keys
```

**Strategy B — Library merges host overrides over its defaults, then registers the merged result:**
```ts
// Library merges internally
const effectiveMessages = deepMerge(libraryDefaults, hostOverrides);
// Registers merged result
i18next.addResourceBundle('en', 'noob-ui', effectiveMessages, true, true);
// Result: hostOverrides win; untranslated sibling defaults preserved
```

Strategy B is closer to the PRD's candidate architecture (precomposed overrides before registration). Strategy A relies on registration order which may be harder to guarantee in asynchronous setups.

### `addResource(lng, ns, key, value)` and `addResources(lng, ns, resources)`

Lower-level APIs for adding individual keys or flat key-value maps [4]. Less useful for library defaults since they don't support deep merge.

### `removeResourceBundle(lng, ns)`

Removes an entire namespace bundle. Could be used for cleanup in tests or SSR request teardown, but not needed for normal override flow.

**Sources:**
- [4] i18next API: https://www.i18next.com/overview/api — documents `addResourceBundle`, `addResource`, `addResources`, `removeResourceBundle`.
- [5] i18next ResourceStore source: https://github.com/i18next/i18next/blob/master/src/ResourceStore.js

---

## 4. Singleton vs. Instance APIs

### Default export: a ready-to-init singleton

```javascript
import i18next from 'i18next';
i18next.init({ /* options */ });
```

The default export is a pre-constructed `I18n` instance ready for `init()`. Calling `init()` multiple times logs a warning [6]. The singleton is the simplest path but is **process-global mutable state** — unsuitable for multiple Vue applications on the same page or SSR.

### `createInstance(options, callback)` — fully independent instances

```javascript
const instance = i18next.createInstance({
  fallbackLng: 'en',
  ns: ['noob-ui'],
  defaultNS: 'noob-ui',
  resources: { en: { 'noob-ui': { /* ... */ } } }
});
instance.init(); // or pass options+callback directly to createInstance
```

Each `createInstance` call returns a new `I18n` instance with its own ResourceStore, Translator, LanguageUtils, backend connector, and plugin state [7]. Instances are fully isolated — language changes, resource additions, and plugin configurations on one instance do not affect any other.

**This is the SSR-safe pattern.** For per-request isolation in SSR, create a fresh instance per request [8]. For multiple Vue applications on the same page, each app receives its own i18next instance [9].

### `cloneInstance(options)` — shared store, independent config

```javascript
const clone = i18next.cloneInstance({
  fallbackLng: 'de',
  defaultNS: 'other',
  forkResourceStore: true  // optional: give clone its own store
});
```

Shares the parent's ResourceStore by default (and plugins/initial configuration), but can fork via `forkResourceStore: true` [6]. Useful when multiple consumers need different language/namespace defaults but share the same translation catalog.

**Sources:**
- [6] i18next API — init/createInstance/cloneInstance: https://www.i18next.com/overview/api#createinstance
- [7] i18next source — I18n constructor and init: https://github.com/i18next/i18next/blob/master/src/i18next.js
- [8] i18next SSR discussion: https://github.com/i18next/i18next/discussions/2062 — "if you only use the per-request t function (req.t) provided by appropriate middleware, you won't need a new instance per request"
- [9] react-i18next SSR docs — per-request isolation via `I18nextProvider`: https://react.i18next.com/latest/ssr

---

## 5. i18next-vue: Vue 3 Integration

### Installation and plugin setup

```javascript
import { createApp } from 'vue';
import i18next from 'i18next';
import I18NextVue from 'i18next-vue';

const instance = i18next.createInstance();
await instance.init({ /* options */ });

const app = createApp(App);
app.use(I18NextVue, { i18next: instance });
app.mount('#app');
```

The plugin accepts an `{ i18next }` options object referencing the i18next instance [10]. This is critical: **the host creates and owns the i18next instance** and passes it to i18next-vue. Libraries never create fallback instances; they receive the shared instance through the plugin.

### Plugin options

```js
app.use(I18NextVue, {
  i18next: myInstance,                       // required — the i18next instance
  rerenderOn: ['languageChanged', 'loaded'],  // optional — events that trigger re-render
});
```

| Option | Description |
|--------|-------------|
| `i18next` | Required. The i18next instance to use. |
| `rerenderOn` | Optional. String array of i18next events that trigger Vue component re-renders. Default in source (v5.4.0): `['languageChanged', 'loaded', 'added', 'removed']`. The docs list `'initialized'` as a supported value, but the current source's default array and its option type exclude it [10][12]. |

### Composition API: `useTranslation(ns?, options?)`

```vue
<script setup>
import { useTranslation } from 'i18next-vue';
const { t, i18next } = useTranslation('noob-ui');
// t('signOut') resolves against the 'noob-ui' namespace
// i18next.language is reactive
</script>
```

Returns `{ t, i18next }` [11]:
- `t`: a translation function scoped to the requested namespace(s)
- `i18next`: the i18next instance (same reference passed to the plugin)

`useTranslation()` supports:
- A single namespace string: `useTranslation('noob-ui')`
- An array of namespaces: `useTranslation(['noob-ui', 'common'])` — `t()` resolves against all, with the first namespace as default
- A second options argument: `useTranslation('noob-ui', { keyPrefix: 'shell', lng: 'de' })`

### Template bindings: `$t()` and `$i18next`

Available in any component template without importing `useTranslation` [10]:

```vue
<template>
  <p>{{ $t('signOut', { ns: 'noob-ui' }) }}</p>
  <p>Current locale: {{ $i18next.language }}</p>
</template>
```

### Locale reactivity

Locale reactivity is implemented in the plugin itself (verified in source [12]):

1. The plugin keeps a `lastI18nChange = shallowRef(new Date())`.
2. For each event in `rerenderOn`, it subscribes: `'added'`/`'removed'` on the ResourceStore, other events on the i18next instance; the handler bumps the ref on `nextTick` so re-renders happen after namespace loading completes.
3. `$t` and the `t` from `useTranslation` are wrapped with access recording so any call registers the component as a translation dependent.
4. `$i18next` is a `Proxy` over the instance whose `get` trap records access, making reads like `i18next.language` reactive.

So `changeLanguage('de')` emits `languageChanged`, the plugin bumps `lastI18nChange`, and every component that called `t()` or read `$i18next` re-renders automatically. Note `i18next` returned from `useTranslation` is the same proxied instance, so `i18next.language` in `<script setup>` is reactive too.

### SSR support

i18next-vue has no explicit SSR documentation. However, the architecture supports SSR through the same pattern used by react-i18next [9]:
- Create a fresh i18next instance per request via `createInstance`
- Pass it to `app.use(I18NextVue, { i18next: perRequestInstance })` during SSR render
- Serialize the initial language and store to the client for hydration

One SSR-relevant behavior verified in source [12]: the wrapped `t` returns `""` (empty string), not the key, while `translationsReady()` is false (instance not initialized, or the requested namespace not yet loaded). It also lazily triggers `loadNamespaces()` for namespaces passed to `useTranslation` that are not yet loaded. For the library pattern in this document, defaults are registered before mount, so `t` never returns empty in normal operation; but if a component requests a namespace that was never registered (e.g., a typo), `t()` renders empty until `loadNamespaces` fails or resolves, and may log a missing-key warning.

**Sources:**
- [10] i18next-vue Getting Started: https://i18next.github.io/i18next-vue/guide/started.html
- [11] i18next-vue Composition API: https://i18next.github.io/i18next-vue/guide/composition-api.html
- [12] i18next-vue GitHub README: https://github.com/i18next/i18next-vue

---

## 6. TypeScript Support

### Key typing via module augmentation

i18next uses TypeScript module augmentation to type resource keys [13]:

```typescript
// i18next.d.ts
import 'i18next';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'noob-ui';
    resources: {
      noobUi: {
        signOut: string;
        shell: {
          title: string;
        };
      };
    };
  }
}
```

Once declared, `t()` accepts a selector function with full autocomplete [13]:

```typescript
i18next.t($ => $.noobUi.signOut);       // ✅ autocompletes
i18next.t($ => $.noobUi.shell.title);   // ✅ autocompletes
```

### Multi-instance / multi-package challenge

The i18next docs explicitly warn [13]:

> "If your project spans multiple i18next instances with different translation resources, it might take a little extra work to set up type-safe translations. For each instance you'll need to create a separate `tsconfig.json` and `i18next.d.ts` file."

**This is the primary TypeScript pain point for library i18n.** A single `CustomTypeOptions` augmentation declares the resource shape for ALL i18next instances in a TypeScript compilation. When `ui` and `admin` both ship type declarations for their namespaces, hosts would need to merge them into one augmentation. If the host has its own namespace too, the augmentation must include all three.

Possible workarounds:
- Libraries ship a type declaration file (e.g., `noob-ui/i18n.d.ts`) that augments `CustomTypeOptions.resources` with the library's namespace keys. Host TypeScript picks up all augmentations.
- Libraries expose a helper to merge their types: `import { extendI18nTypes } from '@noob-naive-ui/ui'`.
- Accept weaker typing: use string keys with runtime validation instead of compile-time key checking.
- Use the `enableSelector: "optimize"` option (v25.4+) to reduce compilation cost while keeping key validation [13].

### `enableSelector` option

As of v25.4, i18next supports `enableSelector: "optimize"` which uses lazy key resolution instead of enumerating all possible keys [13]. This reduces the OOM risk for large resource files and will become the default in v26.

**Sources:**
- [13] i18next TypeScript: https://www.i18next.com/overview/typescript

---

## 7. Bundling and Tree-Shaking

i18next messages are **runtime JSON data**, not compiled code. There is no tree-shaking of unused translations because the bundler cannot statically analyze which keys `t('dynamicKey')` will resolve at runtime.

**Implications for library distribution:**
- Library default messages ship as JSON objects (or `.json` files) that are bundled into the application.
- All registered messages for all namespaces are loaded into memory — there is no dead-code elimination.
- Lazy loading via backend plugins can defer loading of non-critical namespaces, but this adds network latency.
- For a component library with a finite, bounded set of UI strings, the overhead is typically negligible (hundreds of keys, not thousands).

**Comparison to Vue I18n:** Vue I18n has the same characteristic — messages are runtime data. i18next has no disadvantage here.

---

## 8. SSR and Multi-App Safety

### Per-request isolation

The recommended SSR pattern [8][9]:
```javascript
// server.js — per request
import i18next from 'i18next';
import I18NextVue from 'i18next-vue';

async function renderApp(req) {
  const instance = i18next.createInstance();
  await instance.init({
    lng: req.locale,
    resources: { /* preloaded or backend-loaded */ },
  });
  // Optionally register library messages
  // ...

  const app = createSSRApp(App);
  app.use(I18NextVue, { i18next: instance });
  // render...
}
```

Each request gets an independent i18next instance. No cross-request leakage.

### Multiple Vue applications on the same page

Each Vue app calls `app.use(I18NextVue, { i18next: ownInstance })` with its own `createInstance()` result. The instances are fully isolated.

### Process-global mutable state concern

The default export `import i18next from 'i18next'` is a singleton. In SSR or multi-app scenarios, **never use the default export for request-scoped work**. Always use `createInstance()`.

The i18next official docs confirm [6]:
> "If you need complete different configs use `createInstance` or `cloneInstance`."

---

## 9. Library Distribution Pattern

The cleanest pattern for reusable component libraries:

### Library-side (`@noob-naive-ui/ui`)

1. Ship default messages as a JavaScript/TypeScript object:
```typescript
// packages/ui/src/i18n/defaults.ts
export const uiDefaults = {
  en: {
    'noob-ui': {
      signOut: 'Sign out',
      shell: { title: 'Admin' },
      // ...
    },
  },
  de: {
    'noob-ui': {
      signOut: 'Abmelden',
      shell: { title: 'Admin' },
      // ...
    },
  },
};
```

2. Ship a registration function:
```typescript
// packages/ui/src/i18n/register.ts
import type { i18n } from 'i18next';
import { uiDefaults } from './defaults';

export function registerUiMessages(
  instance: i18n,
  overrides?: Partial<typeof uiDefaults['en']['noob-ui']>,
) {
  for (const [lng, nsMap] of Object.entries(uiDefaults)) {
    for (const [ns, messages] of Object.entries(nsMap)) {
      const hostOverrides = overrides?.[lng]?.[ns] ?? {};
      const effective = deepMerge(messages, hostOverrides);
      instance.addResourceBundle(lng, ns, effective, true, true);
    }
  }
}
```

3. Components use the shared instance:
```vue
<script setup>
import { useTranslation } from 'i18next-vue';
const { t } = useTranslation('noob-ui');
</script>
<template>
  <button>{{ t('signOut') }}</button>
</template>
```

### Host-side

```typescript
// Host app
import i18next from 'i18next';
import I18NextVue from 'i18next-vue';
import { registerUiMessages } from '@noob-naive-ui/ui';
import { registerAdminMessages } from '@noob-naive-ui/admin';

const instance = i18next.createInstance();
await instance.init({
  lng: 'en',
  // host's own resources, if any
  resources: { en: { translation: { appTitle: 'My App' } } },
});

// Register library messages, optionally with overrides
registerUiMessages(instance, {
  en: { 'noob-ui': { signOut: 'Log out' } },  // override
});
registerAdminMessages(instance);
// Admin messages use defaults since no overrides provided

const app = createApp(App);
app.use(I18NextVue, { i18next: instance });
app.mount('#app');
```

### Library components render with built-in defaults when host supplies no overrides

Because `registerUiMessages(instance)` is called without overrides, `effective` equals `uiDefaults`, and all keys are registered. Components render their built-in text.

### Deterministic override precedence

The deepMerge inside `registerUiMessages` ensures `hostOverrides` win over `uiDefaults` for every key — no reliance on registration order. The `overwrite: true` flag in `addResourceBundle` is a safety net, not the primary mechanism.

---

## 10. Assessment Against PRD Requirements

| PRD Requirement | i18next + i18next-vue Capability |
|---|---|
| Package components render built-in text | ✅ Library registers defaults via `addResourceBundle` |
| Host passes partial overrides for package messages | ✅ Host passes overrides to library registration function |
| Compute effective messages as `defaults ⋈ overrides` before use | ✅ Library merges host overrides over defaults before registration |
| Host override transport must be deterministic | ✅ Deep merge is pure and deterministic |
| Same global instance drives host, ui, and admin locale changes | ✅ One i18next instance; `changeLanguage` affects all namespaces |
| `ui` and `admin` own distinct message namespaces | ✅ `noob-ui` and `noob-admin` namespaces are fully isolated |
| Host override transport must be app-safe (not process-global mutable) | ✅ `createInstance()` per app; `register*Messages(instance)` scoped to that instance |
| SSR/multi-app safety | ✅ Per-request `createInstance()`; `cloneInstance(forkResourceStore: true)` for sharing catalog with independent config |
| TypeScript | ⚠️ Module augmentation requires host to merge library type declarations; multi-instance setups need separate tsconfig files |
| Bundling/tree-shaking | ❌ No tree-shaking of translations (same as Vue I18n) |
| Repeated component mounts don't cause precedence issues | ✅ Messages registered once per instance; subsequent mounts use existing store data. If `addResourceBundle` is called again, `overwrite: true` ensures idempotency. |
| `AdminShell` locale preference synchronization | ✅ `i18next.language` is reactive; `changeLanguage()` synchronizes all components |
| Deterministic override precedence | ✅ Library-controlled merge order (`deepMerge(defaults, overrides)`) with no dependency on registration timing |

---

## 11. Comparison with Vue I18n Candidate Architecture

The PRD's candidate architecture uses Vue I18n's `useI18n({ useScope: "global", messages: overriddenMessages })` where each component setup merges library messages into the global Composer [14]. The i18next equivalent would be:

| Aspect | Vue I18n Candidate | i18next + i18next-vue |
|---|---|---|
| **Instance ownership** | Host creates Composer via `createI18n` | Host creates i18next instance via `createInstance` |
| **Message registration** | `useI18n({ messages })` per component setup | `addResourceBundle()` once per namespace per instance |
| **Override transport** | Provider plugin + inject OR registration functions | Registration functions receiving the i18next instance |
| **Namespace isolation** | Locale message keys with nested namespace prefixes | First-class namespace system with `ns:key` syntax |
| **Locale reactivity** | Vue I18n's built-in reactivity | i18next events → i18next-vue `rerenderOn` → Vue reactivity |
| **Component API** | `useI18n({ useScope: "global" })` → `t` | `useTranslation('noob-ui')` → `t` |
| **Override precedence** | Deep merge defaults then overrides → `useI18n` merges into global | Deep merge defaults then overrides → `addResourceBundle(overwrite: true)` |

**Key architectural difference:** Vue I18n merges messages at component setup time (`useI18n` per component). i18next registers messages once at the instance level (`addResourceBundle` once per namespace). The i18next approach avoids repeated merges per component instance but loses the ability to have different overrides for different component subtrees within the same namespace (not a requirement in the PRD).

---

## 12. Potential Issues and Edge Cases

### Late override changes after initial registration

If the host wants to change overrides after components have already mounted and called `useTranslation`:
- **Option A:** Remove the bundle and re-register: `instance.removeResourceBundle('en', 'noob-ui'); registerUiMessages(instance, newOverrides);`
- **Option B:** Re-register with `overwrite: true`: `instance.addResourceBundle('en', 'noob-ui', effectiveMessages, true, true);`
- Both trigger the `'added'` event, which causes i18next-vue to re-render affected components.

### Multiple instances sharing the same catalog (SSR optimization)

For SSR performance where the translation catalog is static but locale differs per request:
```javascript
// Shared catalog
const sharedInstance = i18next.createInstance();
await sharedInstance.init({ resources: catalog });

// Per-request: clone with forked store but same catalog
const reqInstance = sharedInstance.cloneInstance({ forkResourceStore: true });
reqInstance.changeLanguage(req.locale);
```
Note: `forkResourceStore: true` creates a copy of the store, so the shared catalog is duplicated in memory per request. This is acceptable for SSR where the catalog is loaded once and cloned per request (memory is released after the request).

### TypeScript amplification across packages

If both `ui` and `admin` ship `i18next.d.ts` augmentations, TypeScript merges both into `CustomTypeOptions.resources`. The host's declaration must also include its own namespace. This works naturally with module augmentation but means all packages' keys are globally visible — `t()` autocomplete shows keys from all namespaces, which may be confusing.

Using the selector API's `scopeNs` support (via `getFixedT(null, 'noob-ui', null, { scopeNs: ['noob-ui'] })`) would scope autocomplete to only the relevant namespace in i18next v26.0.10+ [4]. **However, i18next-vue v5.4.0 does not pass `scopeNs` through** — its `useTranslation` calls `i18next.getFixedT(options.lng, ns, options?.keyPrefix)` with only the three positional arguments, so the `scopeNs` routing that `react-i18next`'s `useTranslation([nsA, nsB])` wires up is not propagated by i18next-vue today (verified in source [12]). Hosts that want scoped selector typing must call `getFixedT` with `scopeNs` directly.

---

## 13. Conclusion

i18next with i18next-vue is a viable alternative to Vue I18n for the library i18n integration task. Its strengths for this use case:

1. **First-class runtime resource registration** with explicit deep merge and overwrite control — no reliance on component lifecycle ordering.
2. **Namespace system** that maps directly to package isolation (`noob-ui`, `noob-admin`).
3. **Instance isolation** via `createInstance` — clean SSR and multi-app safety without workarounds.
4. **Mature ecosystem** with official Vue 3 integration, backend plugins, and language detection.
5. **Registration-function transport** is natural: libraries export `registerXxxMessages(instance, overrides?)` functions that the host calls.

Its weaknesses:
1. **TypeScript is harder** — module augmentation across multiple independent packages requires coordination; multi-instance setups may need separate tsconfig files.
2. **No tree-shaking** — all registered messages are in-memory (same as Vue I18n).
3. **Per-component message override is impossible** — all components using the same namespace share the same messages. This is not a PRD requirement but may constrain future flexibility.
4. **Fewer Vue-ecosystem-specific features** — no built-in locale-aware date/number formatting comparable to Vue I18n's `$d`/`$n`, though i18next has formatting plugins (sprintf, intl-messageformat).

**Sources:**
- [14] PRD candidate architecture: `.trellis/tasks/07-31-library-i18n-integration/prd.md`

---

## Source Index

| Ref | URL |
|-----|-----|
| [1] | https://www.i18next.com/overview/getting-started |
| [2] | https://www.i18next.com/how-to/add-or-load-translations |
| [3] | https://www.i18next.com/principles/namespaces |
| [4] | https://www.i18next.com/overview/api |
| [5] | https://github.com/i18next/i18next/blob/master/src/ResourceStore.js |
| [6] | https://www.i18next.com/overview/api#createinstance |
| [7] | https://github.com/i18next/i18next/blob/master/src/i18next.js |
| [8] | https://github.com/i18next/i18next/discussions/2062 |
| [9] | https://react.i18next.com/latest/ssr |
| [10] | https://i18next.github.io/i18next-vue/guide/started.html |
| [11] | https://i18next.github.io/i18next-vue/guide/composition-api.html |
| [12] | https://github.com/i18next/i18next-vue |
| [13] | https://www.i18next.com/overview/typescript |
| [14] | `.trellis/tasks/07-31-library-i18n-integration/prd.md` |
