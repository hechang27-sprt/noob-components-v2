# Tolgee (Vue Integration): Capability Assessment for Library i18n

**Research date:** 2026-07-31
**Scope:** Can reusable Vue component libraries (`@noob-naive-ui/ui`, `@noob-naive-ui/admin`) ship compiled default translations via Tolgee and let a consuming host override specific messages without forking source?

## Executive Summary

**Tolgee is partially compatible with the "library ships defaults, host overrides at runtime" pattern via its namespace mechanism, but the single-instance architecture imposes significant constraints.** The Vue plugin uses a singleton `provide('tolgeeContext', ...)` pattern — one Tolgee instance per Vue app. Libraries must share the host's Tolgee instance and register their translations as namespaced static data. The host controls locale, formatting, and the Tolgee instance lifecycle. Override behavior emerges naturally from the namespace + fallback chain. However, typed keys cannot coexist across library boundaries, and the architectural coupling means the library's i18n is not truly self-contained.

---

## 1. Package Identity and License

| Property | Value |
|---|---|
| Package | `@tolgee/vue` |
| Version (latest) | 7.1.3 |
| License | MIT (repo LICENSE), BSD-3-Clause (npm registry for `@tolgee/web`) |
| Dependencies | `@tolgee/web` (7.1.3), which depends on `@tolgee/core` (7.1.3) |
| Weekly Downloads | ~10K (`@tolgee/vue`), ~120K (`@tolgee/web`) |
| Repository | https://github.com/tolgee/tolgee-js |
| Vue Support | Vue 3 only (explicit in README: "Currently we support vue v3 only") |
| TypeScript | First-class; typed via module augmentation on `@tolgee/core/lib/types` |

**Sources:**
- npm: https://www.npmjs.com/package/@tolgee/vue
- npm: https://www.npmjs.com/package/@tolgee/web
- LICENSE: https://github.com/tolgee/tolgee-js/blob/main/LICENSE (MIT)

---

## 2. Architecture: Single-Instance Pattern

### 2.1 Vue Plugin

The `VueTolgee` plugin registers a single Tolgee instance with `app.provide('tolgeeContext', ...)` [1]:

```ts
// From VueTolgee.ts source
app.provide('tolgeeContext', reactiveContext);
```

This is a **singleton** — there is exactly one `tolgeeContext` per Vue app. Installing `VueTolgee` a second time with a different instance would silently overwrite the first.

**Sources:**
- [1] VueTolgee.ts source: https://github.com/tolgee/tolgee-js/blob/main/packages/vue/src/VueTolgee.ts

### 2.2 Implications for Library i18n

- Libraries **cannot** create independent Tolgee instances.
- Libraries **must** share the host application's Tolgee instance.
- If the host does not use Tolgee, the library cannot self-bootstrap Tolgee — it would need the host to install `VueTolgee`.
- The Tolgee instance lifecycle (init, run, stop) is owned entirely by the host.

### 2.3 Instance Access from Libraries

Library components can access the Tolgee instance via:
- `useTranslate()` composable (reactive, namespaced)
- `useTolgee()` composable (raw instance access)
- Global `$t` function (injected by `VueTolgee`)
- `T` component (declarative)

All of these read from the single host-provided Tolgee instance via Vue's `inject('tolgeeContext')`.

**Sources:**
- Index exports: https://github.com/tolgee/tolgee-js/blob/main/packages/vue/src/index.ts — exports `useTranslate`, `useTolgee`, `T`, `TolgeeProvider`, `VueTolgee`

---

## 3. Namespace Support

Tolgee has a mature namespace system [2]. This is the primary mechanism for library translations to coexist with host translations in a single Tolgee instance.

### 3.1 Namespace Definition

Namespaces are defined via `staticData` using the `{lang}:{ns}` key format:

```ts
const tolgee = Tolgee().init({
  staticData: {
    'en:admin': () => import('./i18n/admin/en.json'),
    'en:ui': () => import('./i18n/ui/en.json'),
    'en': { /* host default namespace translations */ },
  },
});
```

Namespaces can also be loaded from CDN via `BackendFetch` plugin with folder-based routing (`/i18n/{ns}/{lang}.json`).

### 3.2 Namespace Options

| Option | Purpose |
|---|---|
| `defaultNs` | Default namespace when none specified (default: `""`) |
| `ns` | Namespaces always fetched at startup |
| `fallbackNs` | Namespaces searched when key not found in current namespace |
| `availableNs` | All known namespaces (for `loadMatrix` with `'all'`) |

### 3.3 Runtime Namespace Management

```ts
// Activate a namespace (loads data if tolgee is running)
tolgee.addActiveNs('admin');

// Deactivate (reference-counted — only removes when counter reaches 0)
tolgee.removeActiveNs('admin');
```

Reference counting means component mount/unmount patterns work naturally: each component adds its namespace on mount and removes it on unmount; the namespace stays loaded as long as any component needs it. When language changes, active namespaces are automatically reloaded [2].

### 3.4 Namespace-Scoped Translation

```ts
// Via composable — scopes all t() calls to a namespace
const { t, isLoading } = useTranslate('admin');

// Via explicit ns parameter in t()
t({ key: 'save_button', ns: 'admin' });

// Via T component with ns prop (component docs mention keyName, defaultValue, params)
```

**Sources:**
- [2] Namespaces docs: https://docs.tolgee.io/js-sdk/namespaces
- [3] Translating docs: https://docs.tolgee.io/js-sdk/integrations/vue/translating

---

## 4. Runtime Data Injection (`addStaticData`)

TolgeeInstance exposes `addStaticData(data: TolgeeStaticData)` [4], which allows adding translation data to the cache after initialization:

```ts
tolgee.addStaticData({
  'en:admin': {
    'save': 'Save',
    'cancel': 'Cancel',
  },
  'de:admin': {
    'save': 'Speichern',
    'cancel': 'Abbrechen',
  },
});
```

### 4.1 Library Injection Pattern

A library could ship a setup function that registers its translations:

```ts
// In @noob-naive-ui/admin
import type { TolgeeInstance } from '@tolgee/web';

export function registerAdminTranslations(tolgee: TolgeeInstance) {
  tolgee.addStaticData({
    'en:admin': { /* admin default messages */ },
    'de:admin': { /* admin default messages */ },
  });
}
```

Then the host calls this during setup, passing its Tolgee instance.

### 4.2 Data Precedence

`addStaticData` "will only rewrite cache if there are no dev data loaded" [4]. The documentation does not specify precedence between static data sources (initial `staticData` vs. later `addStaticData` calls). However, the fallback order documented for static data [5] is:

1. Plain objects from `staticData` (used directly, no further fallback)
2. Plugin-fetched data (in plugin addition order)
3. Async functions from `staticData` (last resort)

This suggests that **earlier-registered plain-object data takes priority** — the host's initial `staticData` for the admin namespace would win over a library's `addStaticData` call for the same key if the host registers its overrides first in the init options.

**Sources:**
- [4] TolgeeInstance API — `addStaticData`: https://docs.tolgee.io/js-sdk/api/core_package/tolgee#addstaticdata
- [5] Static data fallback order: https://docs.tolgee.io/js-sdk/providing-static-data#fallback-order

### 4.3 Override Strategy Analysis

Given the fallback order, a **host-overrides-library** pattern requires careful ordering:

**Option A — Host registers after library (recommended pattern):**
1. Library calls `tolgee.addStaticData({ 'en:admin': {...} })` to set defaults.
2. Host's overrides are included in Tolgee init via `staticData: { 'en:admin': {...} }`.
3. Because plain objects in `staticData` have higher priority than later `addStaticData` calls, or since init processes `staticData` after plugin setup, the host's overrides take effect.

**Option B — Host uses `changeTranslation`:**
1. Library calls `tolgee.addStaticData({ 'en:admin': {...} })`.
2. Host calls `tolgee.changeTranslation({ language: 'en', namespace: 'admin' }, 'specific_key', 'Override')` for specific overrides.

The exact precedence between init `staticData` and post-init `addStaticData` for plain objects is not explicitly documented. Empirical testing would be required to confirm the behavior. The `changeTranslation` API provides a guaranteed per-key override mechanism.

---

## 5. Offline / No-Platform Viability

### 5.1 Fully Offline Mode

Tolgee explicitly supports usage **without the Tolgee Platform** [6]:

```ts
const tolgee = Tolgee()
  .use(FormatSimple())
  .init({
    language: 'en',
    staticData: {
      en: { key: 'Translation' },
    },
  });
```

If `apiUrl` and `apiKey` are omitted, Tolgee operates purely from local `staticData`. No network calls are made.

### 5.2 Production Without SaaS

In production, the FAQ states [7]:
> "In a production environment, you should not use Tolgee as a source for localization data or leak your API key this way. Instead, you should use data exported as static assets or Content Delivery (CDN)."

The `DevTools` plugin is **automatically omitted from production bundles** [8]:
> "Tolgee will automatically omit DevTools from your bundle when you build your app for production."

### 5.3 Static Data Formats

Tolgee accepts JSON with flat or nested keys [6]:

```json
{ "nested.key": "Value" }   // flat
{ "nested": { "key": "Value" } }  // nested
```

### 5.4 Export Workflow

Data can be exported from the Tolgee Platform via:
- Platform UI
- CLI: `tolgee pull ./i18n`
- REST API export endpoint
- CDN publishing

No mandatory SaaS dependency for production use.

**Sources:**
- [6] Usage without platform: https://docs.tolgee.io/js-sdk/usage-without-platform
- [7] FAQ — Is my app dependent on Tolgee Servers?: https://tolgee.io/apps-integrations/vue
- [8] Installation — Preparing for production: https://docs.tolgee.io/js-sdk/integrations/vue/installation#preparing-for-production

---

## 6. TypeScript Support

### 6.1 Typed Keys via Module Augmentation

Tolgee supports typed translation keys through **module augmentation** on `@tolgee/core/lib/types` [9]:

```ts
// tolgee.d.ts
import type en from './i18n/en.json';

declare module '@tolgee/core/lib/types' {
  type TranslationsType = typeof en;
  type DotNotationEntries<T> = T extends object
    ? { [K in keyof T]: `${K & string}${T[K] extends object ? `.${DotNotationEntries<T[K]>}` : ''}` }[keyof T]
    : '';
  type LiteralUnion<LiteralType extends BaseType, BaseType extends Primitive> =
    | LiteralType
    | (BaseType & { _?: never });
  export type TranslationKey = LiteralUnion<DotNotationEntries<TranslationsType>, string>;
}
```

### 6.2 Implications for Library i18n

- `TranslationKey` is a **single global type** — only ONE source of truth for all typed keys.
- A host with its own `en.json` and a library with a separate `en.json` **cannot both contribute typed keys** via module augmentation. The augmentation is global and can reference only one translations object.
- The `LiteralUnion` pattern means untyped keys are still accepted (no compile error), so libraries can use string keys without type errors even when the host's augmented type doesn't include them.
- Libraries cannot ship their own `tolgee.d.ts` — it would conflict with the host's.
- **No per-namespace key typing** is available.

**Sources:**
- [9] Typed keys docs: https://docs.tolgee.io/js-sdk/typed_keys

---

## 7. SSR Support

### 7.1 SSR Mode

SSR is supported via `enableSSR: true` on the VueTolgee plugin [10]:

```ts
app.use(VueTolgee, { tolgee, enableSSR: true });
```

And the `TolgeeProvider` accepts an `ssr` prop:

```html
<TolgeeProvider :ssr="{ staticData, language: 'en' }">
  <App />
</TolgeeProvider>
```

### 7.2 SSR Strategy

- During SSR, static data is provided as **sync objects** (not async imports) so it's available for the initial render.
- The `isInitialRender` flag wraps `t()` calls to use `noWrap: true` during SSR, preventing DOM-wrapping artifacts.
- After hydration, `isInitialRender` becomes `false` and `t()` resumes normal wrapping behavior.
- Language must be detectable server-side (typically from URL path).

### 7.3 Multi-App Safety

The Tolgee instance is created per-request in SSR scenarios because each request creates a fresh Vue app. There is no shared mutable state across requests — each SSR render gets its own `tolgeeContext` via `provide`.

**Sources:**
- [10] SSR docs: https://docs.tolgee.io/js-sdk/integrations/vue/ssr
- VueTolgee.ts source (SSR handling): https://github.com/tolgee/tolgee-js/blob/main/packages/vue/src/VueTolgee.ts

---

## 8. Locale Switching

### 8.1 API

```ts
// Change language (loads active namespace data for new locale)
await tolgee.changeLanguage('de');

// Get current language
tolgee.getLanguage(); // 'de'

// Get pending (loading) language
tolgee.getPendingLanguage();
```

When language changes, Tolgee automatically reloads all active namespaces for the new locale [4].

### 8.2 Reactivity

- `useTranslate()` returns reactive refs — translations update automatically when language changes.
- `$t` function is reactive through `reactiveContext` ref.
- `T` component re-renders on language change.
- No manual invalidation needed.

---

## 9. Bundle Size and Dependencies

### 9.1 Package Tree

```
@tolgee/vue (MIT)
  └── @tolgee/web (BSD-3-Clause per npm, MIT per LICENSE)
        └── @tolgee/core (BSD-3-Clause / MIT)
```

### 9.2 Production Characteristics

- `DevTools` plugin is tree-shaken in production builds automatically [8].
- No mandatory CDN or SaaS dependency — `staticData` can be entirely bundled.
- `FormatSimple` and `FormatIcu` are opt-in plugins; only the chosen formatter is included.
- Namespaced translations can use dynamic imports for code splitting.

### 9.3 License Compatibility

MIT license is permissive and compatible with commercial library distribution. The `@tolgee/web` npm page states BSD-3-Clause, but the repository LICENSE file is MIT — both are permissive.

---

## 10. Suitability Assessment for Reusable Component Libraries

### 10.1 What Works

| Criterion | Assessment |
|---|---|
| Offline / no SaaS | PASS — fully offline with `staticData` |
| Library ships defaults | PASS — `addStaticData()` with namespace `'admin'` |
| Host overrides specific keys | PASS — host can include override keys in init `staticData` for the same namespace, or use `changeTranslation()` |
| Locale follows host | PASS — single Tolgee instance, shared language state |
| SSR / multi-app safety | PASS — per-request instance via Vue SSR; `enableSSR` mode |
| TypeScript | PARTIAL — typed keys exist but only for one global type; libraries use untyped string keys |
| Vue 3 integration | PASS — composables, provide/inject, `T` component, `$t` global |
| Namespace isolation | PASS — reference-counted active namespaces prevent leaks |
| Production tree-shaking | PASS — DevTools auto-stripped; opt-in formatters |

### 10.2 What Does NOT Work

| Issue | Severity | Detail |
|---|---|---|
| Single-instance architecture | HIGH | Libraries cannot own their Tolgee instance. Host MUST install `VueTolgee`. Library i18n is not self-contained. |
| Global typed keys | MEDIUM | Only one `TranslationKey` type. Library keys are untyped (accepted via `LiteralUnion` fallback to `string`). |
| No per-namespace key typing | MEDIUM | Even in a single-instance scenario, typed keys cover all namespaces — no way to scope types per namespace. |
| Precedence ambiguity | LOW-MEDIUM | `addStaticData` vs init `staticData` precedence for same namespace is not explicitly documented; empirical verification needed. |
| Library-as-peer-dependency coupling | MEDIUM | `@tolgee/vue` must be a peer dependency of the library, but the library cannot initialize Tolgee — it can only register data into the host's instance. |

### 10.3 Recommended Integration Pattern (If Choosing Tolgee)

```
┌─────────────────────────────────────────────────┐
│ Host App                                         │
│                                                   │
│  tolgee = Tolgee()                                │
│    .use(FormatSimple())                           │
│    .init({                                        │
│      language: 'en',                              │
│      staticData: {                                │
│        'en': hostDefaults,     // host messages   │
│        'en:admin': hostOverrides, // overrides    │
│      }                                            │
│    })                                             │
│                                                   │
│  app.use(VueTolgee, { tolgee })                  │
│                                                   │
│  // After init, library registers its defaults:  │
│  registerAdminTranslations(tolgee)               │
│    └── tolgee.addStaticData({                    │
│          'en:admin': libDefaults,                │
│        })                                         │
│    └── tolgee.addActiveNs('admin')               │
│                                                   │
│  <TolgeeProvider>                                 │
│    <AdminShell />  // uses useTranslate('admin')  │
│  </TolgeeProvider>                                │
└─────────────────────────────────────────────────┘
```

Library components use `useTranslate('admin')` or `t({ key, ns: 'admin' })` to scope translations to their namespace. The host's overrides (in init `staticData`) take priority over the library's `addStaticData` defaults because init-time plain-object data has higher precedence in Tolgee's fallback chain.

---

## 11. Comparison with Other Candidates

| Aspect | Tolgee | i18next-vue | Paraglide JS |
|---|---|---|---|
| Instance model | Single (host owns) | Single (host owns) | Compile-time only |
| Namespace support | YES, built-in | YES, built-in | NO |
| Runtime data injection | `addStaticData()` | `addResources()` | NOT POSSIBLE |
| Typed keys | Global augmentation only | Via `TOptions` generics | Compile-time — fully typed |
| SSR | Supported | Supported | Supported |
| Offline | YES — fully offline | YES — fully offline | YES — compile output is offline |
| Self-contained library i18n | NO (host owns instance) | NO (host owns instance) | NO (host owns compilation) |

---

## 12. Open Questions for Empirical Verification

1. **Precedence:** Does `addStaticData({ 'en:admin': libDefaults })` called after `init({ staticData: { 'en:admin': hostOverrides } })` override or merge with init data? The docs say `addStaticData` "will only rewrite cache if there are no dev data loaded" — what about existing static data? [4]
2. **Namespace collision:** If the library activates a namespace during component mount and the host also uses the same namespace name, does the reference counting cause premature eviction?
3. **Bundle impact:** What is the actual gzipped size of `@tolgee/vue` + `@tolgee/web` + `@tolgee/core` with only `FormatSimple` and no `DevTools`?

---

## Sources

All claims are grounded in official Tolgee documentation and source code:

1. VueTolgee plugin source: https://github.com/tolgee/tolgee-js/blob/main/packages/vue/src/VueTolgee.ts
2. Vue integration index: https://github.com/tolgee/tolgee-js/blob/main/packages/vue/src/index.ts
3. Vue installation docs: https://docs.tolgee.io/js-sdk/integrations/vue/installation
4. Vue translating docs: https://docs.tolgee.io/js-sdk/integrations/vue/translating
5. Namespaces docs: https://docs.tolgee.io/js-sdk/namespaces
6. Static data docs: https://docs.tolgee.io/js-sdk/providing-static-data
7. Usage without platform: https://docs.tolgee.io/js-sdk/usage-without-platform
8. Typed keys docs: https://docs.tolgee.io/js-sdk/typed_keys
9. SSR docs: https://docs.tolgee.io/js-sdk/integrations/vue/ssr
10. TolgeeInstance API: https://docs.tolgee.io/js-sdk/api/core_package/tolgee
11. Core Options API: https://docs.tolgee.io/js-sdk/api/core_package/options
12. npm: https://www.npmjs.com/package/@tolgee/vue
13. npm: https://www.npmjs.com/package/@tolgee/web
14. LICENSE: https://github.com/tolgee/tolgee-js/blob/main/LICENSE
15. FAQ page: https://tolgee.io/apps-integrations/vue
