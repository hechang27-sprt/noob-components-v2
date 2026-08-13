---
type: package
title: "@noob-naive-ui/prototype-i18n-verification"
description: The standalone i18n verification package — a localized PrototypeCard component and its own plugin, used by the demo to prove the component-local Composer override contract.
tags: [i18n, prototype, package, vue-i18n]
---

# `@noob-naive-ui/prototype-i18n-verification`

A standalone prototype (`packages/prototype-i18n-verification`) that **verifies
the library i18n override contract without depending on the shared i18n
package**: it re-implements the same plugin/snapshot/selector pattern directly
inside the package, so the contract's transport can be proven in isolation and
mirrored by any library.

Dependencies: `tsafe` (for `objectEntries`). Peers: `vue`, `vue-i18n`
(`catalog:`). Build uses `@vitejs/plugin-vue` + `plugin-vue-jsx` +
`@intlify/unplugin-vue-i18n` (precompiles `src/locales/**`).

## Public surface (`src/index.ts`)

- `PrototypeCard` — the localized verification component (`prototype-card.tsx`).
- `prototypeI18nPlugin` — the app-scoped override plugin (`plugin.ts`).
- Types: `PrototypeCardMessages` (`{ title, description }`),
  `PrototypeCardLocaleOverrides`, `PrototypeComponentId` (`"PrototypeCard"`),
  `PrototypeLocale` (`"en" | "zh-CN"`), `PrototypeLocaleOverrides`,
  `PrototypeI18nPluginOptions`, `PrototypeI18nSnapshot`.

## The plugin contract (`src/plugin.ts`)

```ts
type PrototypeLocaleOverrides = Partial<
  Record<PrototypeLocale, Partial<Record<PrototypeComponentId, PrototypeCardLocaleOverrides>>>
>;
```

- `prototypeI18nPlugin(app, options?)` provides an immutable snapshot under
  `prototypeI18nOverridesKey` (`Symbol("noob-naive-ui:prototype-i18n-overrides")`).
  Caller options are **defensively copied with `structuredClone` at installation
  time**, so mutating the caller's objects after `app.use` cannot affect mounted
  or future components (test: "snapshots caller overrides during installation").
- Absent installation, `DEFAULT_SNAPSHOT` (frozen `{ messages: {} }`) is
  injected, so packaged defaults always render.
- `selectComponentOverrides(messages, "PrototypeCard")` returns only the locales
  that actually carry a slice for the component (test: "selects only the
  requested component slices by locale").

## `PrototypeCard` component

Renders a localized card through a **fresh, empty component-local Composer**:

1. `useI18n({ useScope: "local", inheritLocale: true, fallbackRoot: false })` —
   starts empty; locale and fallback locale inherit from the host global
   Composer.
2. `composer.fallbackRoot = false` is set **after creation** (Vue I18n 11.4.8
   initializes fallback settings from the root when `__root && inheritLocale`) —
   deliberately the opposite of the shared registry's `fallbackRoot: true`, so
   missing package keys never resolve from host-global registries here.
3. Merges packaged defaults first (`src/locales/PrototypeCard.json`, locale-first
   `{ en, "zh-CN" }`), then the component's plugin override slice — overrides win
   at the leaf without mutating the module-level JSON imports.
4. Renders with verification data attributes: `data-prototype-i18n-card`,
   `data-prototype-i18n-locale`, `data-prototype-i18n-title`,
   `data-prototype-i18n-description` — consumed by the demo page and tests.

## Tests — `tests/i18n-contract.test.ts`

happy-dom harness (`mountPrototypeCard`) plus a snapshot-capture plugin (4 `it`
tests):

- plugin: snapshots caller overrides at install (defensive copy); selects only
  requested component slices by locale.
- PrototypeCard locale ownership: merges a partial override after defaults
  without losing siblings (packaged defaults render when the plugin is not
  installed, and non-overridden leaves survive); inherits the host fallback
  without changing an unsupported active locale (locale `fr` stays active while
  `zh-CN` fallback messages render).

## Related

- [i18n package](i18n.md) — the shared factory this package mirrors
- [Demo host](../apps/demo.md) — `InternationalizationDemoPage` renders
  `PrototypeCard` with locale diagnostics
th locale diagnostics
