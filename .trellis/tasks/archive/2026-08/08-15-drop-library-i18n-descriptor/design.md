# Design — hook `createComponentI18n` into `LibraryOverridesRegistry`

## 0. Problem

`library-i18n-descriptor.ts` exists to pin a package's locale schema at type level
(`LibraryI18nDescriptor<LocaleName, Locale>` + the `__i18n` phantom brand) so
`createComponentI18n` can type its component selector and override fallback.
The 08-14 registry task already pinned the SAME schema per `libraryId` via module
augmentation (`locale: Record<LocaleName, Locale>` in `LibraryOverridesRegistry`)
and derived `RegistryI18nOverrides` from it. The descriptor is therefore a second
declaration of the same fact — and the registry keyed by the same string the
runtime already uses is strictly stronger than a brand on a `{ libraryId }`
handle (the type key and the runtime key can never diverge).

## 1. Registry package hosts the i18n derivation (mirror of `library-theme-overrides.ts`)

New `packages/registry/src/library-i18n-overrides.ts` — the registry-derived i18n
typing, parallel to the theme file:

```ts
// packages/registry/src/library-i18n-overrides.ts
import type { LibraryOverridesRegistry, RegistryI18nOverrides } from "./library-overrides-registry";

/** Locale-name union declared by one library's registry entry (e.g. "en" | "zh-CN"). */
export type RegistryLocaleName<K extends keyof LibraryOverridesRegistry> =
  keyof LibraryOverridesRegistry[K]["locale"];

/** The library's component-first full locale schema (value type of the locale record). */
export type RegistryLocale<K extends keyof LibraryOverridesRegistry> =
  LibraryOverridesRegistry[K]["locale"][RegistryLocaleName<K>];

/** LibraryIds that declare a usable (non-empty) locale schema (preseeded excluded). */
export type RegistryI18nLibraryKey = {
  [K in keyof LibraryOverridesRegistry]: RegistryLocaleName<K> extends never ? never : K;
}[keyof LibraryOverridesRegistry];
```

The i18n override tree itself is NOT a helper: public aliases inline the
projection directly (`NonNullable<RegistryI18nOverrides["noob-naive-ui:admin"]>`),
so the `| undefined` strip lives at each usage site. (An earlier
`RegistryI18nOverridesFor<K>` helper was dropped on review — it duplicated the
projection and added API surface without earning its keep.)

All three are exported from the registry barrel (`packages/registry/src/index.ts`);
the i18n package imports them — **no local copies** (single source of truth for
deriving i18n types off `LibraryOverridesRegistry`, mirroring how
`LibraryThemeOverrides`/`LibraryThemeDescriptor` live in the registry).

## 1a. New `createComponentI18n` contract

```ts
// packages/i18n/src/use-component-i18n.ts
import type { RegistryLocaleName, RegistryLocale, RegistryI18nLibraryKey } from "@noob-naive-ui/registry";

export function createComponentI18n<
  K extends RegistryI18nLibraryKey,
  LocaleName extends RegistryLocaleName<K> = RegistryLocaleName<K>,
  Locale extends object = RegistryLocale<K> & object,
>(options: {
  messages: Readonly<Record<NoInfer<LocaleName>, unknown>>;
  libraryId: K;
  componentId: NoInfer<keyof Locale & string>;
}): Composer { … }
```

- **Why the secondary `LocaleName`/`Locale` params?** Generic-over-`K`
  projections (`RegistryI18nOverrides[K]`, `LibraryOverridesRegistry[K]["locale"]`)
  collapse inside generic bodies (see `research/type-proof.md` §2). The secondary
  params default from `K` at call sites (callers never write them) and stay
  opaque inside the body, so the existing fully-generic
  `selectComponentOverrides(snapshot, componentId)` call type-checks unchanged.
- **Why `NoInfer` on `messages` and `componentId`?** Without it, TS infers
  `LocaleName` from a partial `messages` object (silently dropping the
  all-locales-required check) and infers `Locale` from the componentId string
  (widening the component check to any string). With `NoInfer`, both default from
  `K` (TS ≥ 5.4; repo already compiles it).
- **Boundary cast stays** (registry value is loose at the provider boundary):
  `(registry?.value?.[libraryId]?.i18n ?? emptySnapshot) as Partial<Record<LocaleName, DeepPartial<Locale>>>`.
- `K` is constrained to `RegistryI18nLibraryKey`: preseeded `naive-ui`/`pro-naive-ui`
  (`locale: unknown` → `keyof unknown` = `never`) are excluded; a declared entry
  with `Record<never, never>` (ui today) is admissible but has `componentId:
  never` — exactly today's `NoobUiComponentId = never`.

## 2. What disappears from `library-i18n-descriptor.ts`

| Export | Disposition |
| --- | --- |
| `LibraryI18nDescriptor` | deleted — the registry key IS the brand |
| `LibraryI18nOverrides` | deleted — `NonNullable<RegistryI18nOverrides[K]>` is structurally identical (mutual assignability verified) |
| `LibraryI18nSnapshot` | deleted — same replacement |
| `LibraryI18nComponentSelector` | deleted — dead public type (exported, referenced nowhere) |
| `emptySnapshot` | moved to `use-component-i18n.ts`; still exported from the i18n barrel |
| `selectComponentOverrides` | moved to `use-component-i18n.ts`; signature unchanged; body switches `tsafe/objectEntries` → `Object.keys(messages) as LocaleName[]` (equivalent iteration, one contained cast) → drop `tsafe` from `packages/i18n` |

The derivation helpers live in the **registry package** (design §1) — the
registry barrel grows by the four exported types, consistent with it being the
framework-wide override-typing home. `DeepPartial` keeps coming from the registry
(already imported). `selectComponentOverrides` and `emptySnapshot` stay in the
i18n package: they are runtime i18n behavior, not registry-type derivation (the
theme mirror has no runtime selector either — `useUiTheme` reads inline in ui).

## 3. Public aliases re-derived (names and shapes preserved)

`packages/admin/src/i18n/admin-locale.ts`:
```ts
export type AdminLocaleOverrides =
  NonNullable<RegistryI18nOverrides["noob-naive-ui:admin"]>;
```
`packages/admin/src/i18n/plugin.ts`:
```ts
export const adminI18n = "noob-naive-ui:admin" as const;   // keyof LibraryOverridesRegistry
export type AdminI18nSnapshot =
  NonNullable<RegistryI18nOverrides["noob-naive-ui:admin"]>;
```
`packages/ui/src/i18n/plugin.ts`: `noobUiI18n = "noob-naive-ui:ui" as const`;
`NoobUiI18nSnapshot` / `NoobUiLocaleOverrides` =
`NonNullable<RegistryI18nOverrides["noob-naive-ui:ui"]>`.
`NoobUiLocaleName` / `NoobUiLocale` / `NoobUiComponentId` stay as-is (ui's schema
is still the empty record).

The `NonNullable` strip (inlined at each alias) preserves today's exact shape — `RegistryI18nOverrides` is an optional
mapped type (`?` on every entry), so the bare indexed projection yields
`T | undefined`, which the aliases never had. The strip is required for
two-way assignability with the old shape and because the selector's `messages`
parameter is exactly `T` (`T | undefined` is not assignable to `T`).
See research §1b.

## 4. `AdminProvider` render loses its cast maze

```tsx
// before (4 casts)
i18n={props.i18nOverrides?.[adminI18n.libraryId as keyof RegistryI18nOverrides] as AdminLocaleOverrides | undefined}
themeOverride={provider.activeTheme.value?.themeOverrides?.[adminI18n.libraryId as keyof AdminPresetThemeOverrides] as AdminThemeOverrides | undefined}

// after (typed indexing; literal key)
i18n={props.i18nOverrides?.[adminI18n]}
themeOverride={provider.activeTheme.value?.themeOverrides?.[adminI18n]}
```
Same for the `noobUiI18n` pair. `AdminConfigProvider` /
`AdminUiConfigProvider`'s merge key `[adminI18n.libraryId]` / `[noobUiI18n.libraryId]`
become `[adminI18n]` / `[noobUiI18n]` (computed key from a literal const).

## 5. Tests

- **`packages/i18n/tests/use-component-i18n.test.tsx`**: add a file-local
  `declare module "@noob-naive-ui/registry"` entry for `"test-library"`
  (`{ locale: Record<TestLocaleName, TestLocale>; theme: {} }`); replace
  `descriptor: testDescriptor` with `libraryId: "test-library"`; the
  `mount()` helper keeps providing `libraryOverridesKey` with
  `{ "test-library": { i18n: options.overrides } }`.
- **`packages/i18n/tests/library-i18n-descriptor.test.ts`** → rewrite as
  `library-i18n-selector.test.ts` (or fold into the composable test): keep the
  `emptySnapshot` frozen check and the `selectComponentOverrides` slice/absent-
  locale checks; drop the descriptor-shape assertions (a `{ libraryId }` object
  no longer exists).
- **`packages/admin/tests/i18n-contract.test.tsx`**: `selectComponentOverrides`
  import now resolves from the new home in `use-component-i18n.ts` (still
  `@noob-naive-ui/i18n`); call sites and `AdminI18nSnapshot` usage unchanged.
- The type-level regressions are covered by the compile-time checks in the
  composable test (valid/invalid component ids, all-locales-required, preseeded
  exclusion can be asserted with `// @ts-expect-error`).

## 6. Docs

- `.trellis/spec/ui/frontend/library-i18n-contract.md` §2 signature block and §3
  contract bullets: descriptor handle (`LibraryI18nDescriptor`, `__i18n` brand)
  → registry-keyed `createComponentI18n({ messages, libraryId, componentId })`;
  mention that the locale schema is declared once via the `LibraryOverridesRegistry`
  augmentation and consumed through `RegistryI18nOverrides`.
- `packages/registry/src/library-overrides-registry.ts` doc comment (~line 54)
  references `LibraryI18nOverrides` — reword to the registry projection.

## 7. Compatibility & risks

- **Breaking** (intentional, consistent with the two prior registry tasks):
  i18n barrel loses 4 types; `createComponentI18n` option shape changes. All
  consumers are in-repo; clean cutover, no aliases.
- **TS generic-site degradation** is the main risk; the verified signature
  (research §3) avoids it. Any change to the signature must re-run the scratch
  proof (keep `.scratch-i18n-proof/` until the task lands, then delete).
- **`NoInfer` availability**: TS ≥ 5.4; repo compiles it (verified).
- **Rollback**: coordinated revert of i18n + admin + ui + registry-comment +
  spec changes; no release before approval. The registry runtime value shape,
  injection key, providers, and all runtime behavior are untouched, so the
  rollback is a source revert only.

## 8. Follow-up (out of scope)

Same folding for the theme side: `noobUiTheme: LibraryThemeDescriptor<…>` →
literal const; `useUiTheme` reads `noobUiTheme.libraryId` → the const; theme
schema comes from `LibraryOverridesRegistry[K]["theme"]`. Could later delete
`packages/registry/src/library-theme-overrides.ts` too. Deliberately not in this
task.

## 9. naive-ui locale hooked into the registry (architect-directed add-on)

naive-ui's locale override option = `NConfigProvider.locale`/`dateLocale`
(full packs; no internal merge — verified in `ConfigProvider.mjs`:
`mergedLocaleRef = props.locale`). The registry hook (implemented):

- **Registry preseed** (`library-overrides-registry.ts`):
  `"naive-ui"` / `"pro-naive-ui"` → `{ locale: NaiveUiLocale; theme: GlobalThemeOverrides }`
  with `NaiveUiLocale = { locale: NPartialLocale; dateLocale: NDateLocale }`
  (`naive-ui-locale.ts`, exported from the barrel).
- **`NPartialLocale`, not `NLocale`**: empirically required — the registry's
  `DeepPartial` mangles function leaves of the full `NLocale`, breaking
  assignability to `createLocale`'s parameter; `DeepPartial<NPartialLocale>`
  is exactly `NPartialLocale` (research §9c). Mirrors the theme preseed
  precedent (override form, structural no-op).
- **Consumer**: `mergeAdminNaiveUiLocaleOverrides(base, overrides)` in
  `naive-ui-config.ts` — `createLocale(overrides.locale, base.nLocale)` for
  the pack, es-toolkit `merge` for the date pack; `useAdminProvider` gains
  `options.naiveUiLocaleOverrides`, `naiveUiConfig` merges over the
  preference-resolved base packs; `AdminProvider` passes
  `props.i18nOverrides?.["naive-ui"]` (registry i18n projection, typed by the
  preseed).
- **Provision path**: direct options pass-through, not a runtime registry
  inject — AdminProvider's own setup cannot see its own `provide` (inject
  resolves before provide in the same setup). Documented in research §9c.
- **Admissibility consequence (accepted)**: naive-ui / pro-naive-ui become
  `RegistryI18nLibraryKey` members; `createComponentI18n` compiles for them but
  is semantically meaningless (naive-ui texts are consumed by naive-ui's own
  locale context, not vue-i18n). Documented in the preseed comment + tests.
