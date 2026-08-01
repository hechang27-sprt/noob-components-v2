# Design: Refine Prototype I18n Boundaries

## Authority Model

The host owns both active locale and fallback locale through its single global Composer:

```text
hydrated preference -> global Composer locale -> local Composer locale
host createI18n fallbackLocale -----------> local Composer fallbackLocale
```

The package plugin transports only a defensively copied `messages` override tree. `PrototypeCard` keeps `inheritLocale: true`, so Vue I18n propagates root locale and fallback-locale changes. It sets `composer.fallbackRoot = false` after `useI18n()` so missing package keys cannot escape into host-global messages.

## Package API

```ts
export interface PrototypeI18nPluginOptions {
  messages?: PrototypeLocaleOverrides
}

type PrototypeI18nSnapshot = {
  messages: PrototypeLocaleOverrides
}
```

Remove `DEFAULT_FALLBACK_LOCALE`, snapshot fallback state, fallback validation, and fallback-related root exports. Keep the options wrapper so future package-owned override controls can be additive without changing plugin installation shape.

## Component Flow

```ts
const { messages } = inject(prototypeI18nOverridesKey, DEFAULT_SNAPSHOT)
const composer = useI18n({
  useScope: "local",
  inheritLocale: true,
  fallbackRoot: false,
})
composer.fallbackRoot = false
const { locale } = composer

composer.mergeLocaleMessage("en", en)
composer.mergeLocaleMessage("zh-CN", zhCN)
for (const [overrideLocale, componentMessages] of objectEntries(
  selectComponentOverrides(messages, "PrototypeCard"),
)) {
  if (componentMessages !== undefined) {
    composer.mergeLocaleMessage(overrideLocale, componentMessages)
  }
}
```

`selectComponentOverrides` accepts the message tree directly rather than the whole snapshot. Both it and the component use `objectEntries` from `tsafe`, eliminating locale casts while keeping optional locale keys precise.

Composer methods remain qualified (`composer.t`, `composer.mergeLocaleMessage`) because the repository's type-aware `unbound-method` rule rejects destructured methods. This keeps lint clean without suppressions, wrappers, or avoidable binding allocations.

## Source-Consumed Build Boundary


Two consumption modes remain distinct:

1. **Built package:** the library build precompiles its JSON into distributable JavaScript. Host Vite configuration does not include library source resources.
2. **No-build workspace source consumption:** the host build compiles imported package source, so one shared repository Vue I18n preset covers `apps/*/src/locales/**` and `packages/*/src/locales/**`. Packages expose no source-resource Vite subpaths, and consumers do not enumerate libraries.

The shared preset resolves structural workspace globs from its own module. This keeps physical layout knowledge in internal tooling and allows source-consuming Vite builds without dependency prebuilds.

## Demo Verification Harness

Replace package fallback query configuration with host configuration:

- `prototypeGlobalFallback=<locale>` is read before `createI18n()` and passed as the global `fallbackLocale`.
- `prototypeLocale=<locale>` still seeds the host preference/global locale.
- `prototypeI18n=override` still verifies immutable partial message overrides.
- `prototypeGlobalFallback=zh-CN&prototypeLocale=fr` proves the local Composer inherits host fallback while global locale remains `fr`.

Remove the package snapshot fallback data attribute. Browser assertions use rendered text plus the existing global/local locale attributes.

## Compatibility and Documentation

This is a clean prototype API cutover; no compatibility shim remains. Update:

- archived prototype findings;
- parent design and PRD conclusions;
- `.trellis/spec/ui/frontend/library-i18n-contract.md` signatures, contracts, matrix, cases, tests, and examples.

## Risks and Mitigations

- **Shared preset resolution:** verify `apps/demo/vite.config.ts` builds from source with package `dist` removed and no package-specific resource export.
- **`objectEntries` optional keys:** package typechecking proves locale keys and values remain accepted by `mergeLocaleMessage` without casts.
- **Root fallback inheritance:** browser scenario with active `fr` and global fallback `zh-CN` proves behavior after removing package fallback mutation.
- **Runtime helper dependency:** `tsafe` is a normal prototype dependency and is bundled into the library output rather than exposed as a peer.
