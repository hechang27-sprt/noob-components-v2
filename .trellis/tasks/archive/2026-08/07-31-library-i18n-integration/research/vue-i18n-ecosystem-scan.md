# Vue 3 i18n Ecosystem Scan — Alternatives Beyond the Main Contenders

**Date**: 2026-07-31
**Scope**: Libraries beyond vue-i18n, i18next-vue, fluent-vue, tolgee, and paraglide-js (covered separately). Focus on runtime message override, resource layering, and the "host owns runtime, library ships defaults" pattern.

---

## Shortlist

| Library | Vue 3 Runtime | Runtime Override | Resource Layering | Maintenance | Verdict |
|---|---|---|---|---|---|
| **Lingui** | ❌ No official runtime bindings | ✅ `i18n.load()` merges catalogs (if bindings existed) | ✅ Catalog merge via Object.assign | Active (v6.6.0, Jul 2026) | **NOT viable** — no Vue runtime package |
| **typesafe-i18n** | ✅ `@typesafe-i18n/adapter-vue` | ❌ Compiler-first: functions baked at build time | ⚠️ `extendDictionary` at compile time only | Active (v5.27.1, Feb 2026) | **NOT viable** — cannot override message content at runtime |
| **Intlayer** | ✅ `vue-intlayer` + vue-i18n compat adapter | ⚠️ Through vue-i18n compat layer | ✅ Dictionary declarations, CMS-backed | Active (v9, 2026) | **MARGINAL** — compat adapter delegates to vue-i18n API; not a distinct approach |
| **@byjohann/vue-i18n** | ✅ Native Vue 3 plugin | ⚠️ Lazily add messages, no layered merge API | ❌ No namespace/layering | Maintained (2025-2026) | **NOT viable** — too simple |
| **Tanzlate** | ✅ `@tanzlate/vue` | ⚠️ i18next-based resource config | ⚠️ Namespace in config | Early (v0.3.x) | **NOT viable** — i18next-based; too early |
| **@planning.nl/vue3-i18n** | ✅ Vue 3 plugin | ✅ `patchStrict`/`patchLocaleStrict` for library overrides | ✅ Module translation export/override | **Abandoned** (v0.0.14, Jul 2021) | **NOT viable** — abandoned |
| **Fluenti** | ✅ Vue plugin | ❌ Compiler-first (ICU → JS functions) | ❌ Build-time only | Active | **NOT viable** — same class as Paraglide |

---

## Per-Library Findings

### Lingui (`lingui/js-lingui`)

**Source**: https://lingui.dev, https://github.com/lingui/js-lingui, npm registry

- **Core runtime**: `@lingui/core` provides `i18n.load(locale, messages)` which merges catalogs via `Object.assign`. This is the right primitive for runtime override — load defaults, then load overrides.
- **Vue extractor**: `@lingui/extractor-vue` (latest v6.6.0, Jul 2026, per npm registry) extracts messages from .vue SFC files. Configuration supports Vue 3 Reactivity Transform.
- **Vue runtime bindings**: `@lingui/vue` does **not exist** as a published npm package. PR #1925 ("feat: add full support of Vue.js") adds Vue runtime bindings but remains in **draft** and unmerged as of July 2026. Discussion #1730 tracks the effort; the component is ~80% complete with tests pending.
- **Lingui 6.0** (Apr 2026): ESM-only, reduced dependency graph. Vue extractor improvements (reactivity transform). Still no Vue runtime package.
- **Assessment**: The architecture (`i18n.load` merge) is conceptually right for the host/library override pattern, but without production Vue runtime bindings, Lingui is not a viable alternative today. It could become one if the Vue bindings PR ships.

### typesafe-i18n (`codingcommons/typesafe-i18n`)

**Source**: https://github.com/codingcommons/typesafe-i18n, https://www.npmjs.com/package/typesafe-i18n

- **Status**: Actively maintained by community stewards (Sasan Jaghori, Martin Ledl, Benjamin Strasser, Jacob Palecek) after original creator Ivan Hofer's passing. Latest: v5.27.1 (Feb 11, 2026).
- **Architecture**: Generator-based. Translations live in `.ts` files; the generator creates typed wrapper functions at build time. Each translation key becomes a typed function call.
- **Vue adapter**: `@typesafe-i18n/adapter-vue` (~1.2KB gzipped). Installed as a Vue plugin; wraps the generated `LL` (locale loader) object for Vue reactivity.
- **`extendDictionary`**: Provides locale merging but at **compile time** — used to create locale variants (e.g., `en-US` extending `en`). Not designed for runtime host override of library messages. Issue #741 documents problems with nested namespace merging.
- **Runtime override**: The core design precludes it. Translations are compiled into functions; there is no runtime catalog that an independent host can mutate. A custom wrapper could consult a runtime override map before calling the generated function, but this would weaken type safety and is not an official workflow.
- **Assessment**: Compiler-first architecture fundamentally incompatible with the "host overrides library messages at runtime" requirement. Same class of problem as Paraglide JS.

### Intlayer (`aymericzip/intlayer`)

**Source**: https://intlayer.org, https://github.com/aymericzip/intlayer

- **Status**: Active development, v9 released (2026). Per-component i18n model with build-time content extraction.
- **Vue integration**: `vue-intlayer` package provides Vue 3 plugin. `@intlayer/vue-i18n` compat adapter emulates vue-i18n API — imports are aliased via Vite plugin. This means Intlayer can serve as a drop-in replacement for vue-i18n.
- **Runtime**: v9 introduces a unified runtime resolver (`@intlayer/core/messageFormat`) for message interpolation, plurals, and rich text. Dictionaries are declared per-component and can include dynamic layouts.
- **Override model**: Content is declared in component-adjacent declaration files and extracted at build time. Runtime override of message content by an external host is not the primary design path — Intlayer leans toward CMS-backed content management and visual editing.
- **Assessment**: If used through the vue-i18n compat adapter, Intlayer would inherit vue-i18n's runtime message merge semantics (`mergeLocaleMessage`). This makes it functionally equivalent to using vue-i18n directly for the override pattern — not a fundamentally different approach. The per-component content model aligns with library-owned defaults but doesn't solve the host override transport problem better than vue-i18n itself.

### @byjohann/vue-i18n

**Source**: https://github.com/johannschopplich/vue-i18n, https://www.npmjs.com/package/@byjohann/vue-i18n

- **Status**: Maintained, MIT license. Lightweight (~1KB core), zero dependencies.
- **API**: `createI18n({ defaultLocale, locales, messages })` → `app.use(i18n)`. `useI18n()` composable returns `{ locale, t, setLocale, getLocale, messages }`.
- **Messages**: Passed at creation time. `messages` is exposed as a reactive ref, so it can be mutated at runtime. "Lazily add translations at runtime" is mentioned as a feature, but there is no explicit deep merge or namespace API.
- **Type safety**: Supports generic `useI18n<Locale, Messages>()` for typed locales and message shapes. Nested keys via dot notation.
- **Assessment**: Clean and simple, but lacks the namespace/layering primitives needed for the host/library override pattern. Adding partial overrides would require the host to manually deep-merge into the reactive `messages` ref with no library-provided guardrails. Not designed for the multi-package component library use case.

### Tanzlate (`tanzlate/tanzlate`)

**Source**: https://github.com/tanzlate/tanzlate

- **Status**: Early stage (v0.3.x). Built on i18next runtime (`@tanzlate/vanilla` wraps i18next).
- **Vue integration**: `@tanzlate/vue` provides `I18nProvider` + `useI18n` composable. Supports namespaced resources via `i18nConfig`.
- **Focus**: Component interpolation within translation strings — embedding Vue components inside localized messages while preserving full-sentence context.
- **Assessment**: i18next-based (covered by sibling research). Early stage. The component interpolation focus is orthogonal to the host/library override problem. No advantage over i18next-vue for our use case.

### @planning.nl/vue3-i18n

**Source**: https://www.npmjs.com/package/@planning.nl/vue3-i18n

- **Status**: **Abandoned**. Last release v0.0.14 in July 2021.
- **Notable feature**: Had explicit library/module i18n support — `patchStrict` and `patchLocaleStrict` for allowing consuming apps to override library translations. This is precisely the pattern the PRD describes.
- **Assessment**: The right idea at the wrong time. Abandoned for 5 years. Not viable.

### Fluenti

**Source**: https://fluenti.dev

- **Status**: Active. Compile-time i18n: ICU messages → pre-compiled JavaScript functions.
- **Assessment**: Compiler-first architecture. Same fundamental limitation as Paraglide JS and typesafe-i18n — message content is fixed at build time. Not viable for runtime host overrides.

---

## Key Insight

**No surveyed alternative to vue-i18n provides a production-ready, well-maintained solution for the host-owned-runtime-with-library-defaults-plus-partial-override pattern.**

The only libraries with relevant runtime override primitives are:

1. **vue-i18n** (baseline): `mergeLocaleMessage`, `useI18n({ useScope: "global", messages })` — the architecture the PRD already assumes.
2. **i18next-vue**: i18next's `addResourceBundle` with `deep: true` and `overwrite: true` — sibling research covers this.
3. **Lingui** (conceptually): `i18n.load()` merges catalogs — but **no Vue runtime bindings exist**.

The compiler-first libraries (Paraglide, typesafe-i18n, Fluenti) all share the same limitation: message content is fixed at build time, making host runtime overrides impractical without custom infrastructure that negates their primary advantages.

---

## Sources

- Lingui official docs: https://lingui.dev/introduction, https://lingui.dev/ref/core, https://lingui.dev/ref/extractor-vue
- Lingui GitHub: https://github.com/lingui/js-lingui (PR #1925, Discussion #1730)
- Lingui 6.0 announcement: https://lingui.dev/blog/2026/04/22/announcing-lingui-6.0
- typesafe-i18n GitHub: https://github.com/codingcommons/typesafe-i18n
- typesafe-i18n npm: https://www.npmjs.com/package/typesafe-i18n (v5.27.1, 2026-02-11)
- typesafe-i18n maintenance announcement: https://github.com/codingcommons/typesafe-i18n/discussions/774
- Intlayer: https://intlayer.org, https://github.com/aymericzip/intlayer
- @byjohann/vue-i18n: https://github.com/johannschopplich/vue-i18n
- Tanzlate: https://github.com/tanzlate/tanzlate
- @planning.nl/vue3-i18n: https://www.npmjs.com/package/@planning.nl/vue3-i18n
- Fluenti: https://fluenti.dev
- Intlayer benchmark (vue-i18n vs fluent-vue vs Intlayer): https://github.com/aymericzip/intlayer/blob/main/docs/docs/en/benchmark/vue.md
