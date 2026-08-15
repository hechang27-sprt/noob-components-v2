# Research — folding `createComponentI18n` into `LibraryOverridesRegistry`

**Date**: 2026-08-15
**Task**: 08-15-drop-library-i18n-descriptor

## Question

Given that `@noob-naive-ui/registry` already declares each component package's FULL
locale + themeVar types via module augmentation into `LibraryOverridesRegistry`
(`locale: Record<LocaleName, Locale>`, `theme: Components`) and derives
`RegistryI18nOverrides` / `RegistryThemeOverrides` from them, can we delete
`packages/i18n/src/library-i18n-descriptor.ts` and have `createComponentI18n`
read its locale schema from the registry instead of a per-package descriptor?

## Answer (short)

**Yes.** `RegistryI18nOverrides["<libraryId>"]` is structurally identical to the
descriptor file's `LibraryI18nOverrides<LocaleName, Locale>` (verified by mutual
assignability below), so the whole typed-handle machinery
(`LibraryI18nDescriptor` + `__i18n` brand, `LibraryI18nOverrides`,
`LibraryI18nSnapshot`, `LibraryI18nComponentSelector`) is redundant: the registry
entry itself is the schema pin, keyed by the same `libraryId` string that the
runtime already uses. The descriptor's runtime value was only ever `{ libraryId }`,
which becomes the literal libraryId argument.

## What each descriptor-file export becomes

| Export | Fate |
| --- | --- |
| `LibraryI18nOverrides<L, Loc>` | deleted; `AdminLocaleOverrides` / `NoobUiLocaleOverrides` re-derived as `NonNullable<RegistryI18nOverrides["…"]>` (structurally identical — verified) |
| `LibraryI18nSnapshot<L, Loc>` | deleted; `AdminI18nSnapshot` / `NoobUiI18nSnapshot` re-derived identically |
| `LibraryI18nDescriptor<L, Loc>` (`{ libraryId, __i18n? }`) | deleted; `adminI18n` / `noobUiI18n` become libraryId literal consts (the registry key IS the brand) |
| `LibraryI18nComponentSelector` | deleted (dead public type — exported, referenced nowhere) |
| `emptySnapshot` (frozen `{}`) | moved into `use-component-i18n.ts`, still exported from the i18n barrel |
| `selectComponentOverrides` | moved into `use-component-i18n.ts`; signature unchanged (generic over Locale types); body switches `tsafe/objectEntries` → `Object.keys` + one cast, dropping the `tsafe` dep |

## Type-level verification (scratch tsc run, repo tsconfig)

Scratch experiment at repo root `.scratch-i18n-proof/` (git-excluded), run with
`npx tsc -p` against the repo's `tsconfig.json` compiler options + the real
`packages/registry/src/index.ts` source. All claims below compiled green (RC 0).

### 1. `RegistryI18nOverrides[K]` ≡ `LibraryI18nOverrides<L, Loc>` (mutual assignability)

```ts
type Old = LibraryI18nOverrides<"en" | "zh-CN", AdminLocale>;
type New = NonNullable<RegistryI18nOverrides["noob-naive-ui:admin"]>;
const a1: New = old; // old -> new ✓
const a2: Old = new; // new -> old ✓
```
Structural identity: `DeepPartial<Record<L, Loc>>` = `Partial<Record<L, DeepPartial<Loc>>>`
when `Loc extends object` (the declared augmentation shape).

### 1b. Why `NonNullable`? (the outer `| undefined` from the optional mapped type)

`RegistryI18nOverrides` is an **optional mapped type**:

```ts
export type RegistryI18nOverrides = {
  [K in keyof LibraryOverridesRegistry]?:   // <-- `?` makes every entry optional
    LibraryOverridesRegistry[K] extends { locale: infer Locale } ? DeepPartial<Locale> : never;
};
```

Indexing an optional property/mapped entry yields the value type **plus `undefined`**,
so the bare projection is NOT the override tree — it is the tree OR undefined:

```ts
type Projection = RegistryI18nOverrides["noob-naive-ui:admin"];
// = DeepPartial<Record<AdminLocaleName, AdminLocale>> | undefined
```

whereas the old alias is exactly the tree (verified by `undefined extends X` checks):

```ts
type Old = LibraryI18nOverrides<AdminLocaleName, AdminLocale>;
// = Partial<Record<AdminLocaleName, DeepPartial<AdminLocale>>>   (no outer undefined)
```

`NonNullable` strips exactly that outer `| undefined`. Why it is required, not cosmetic:

1. **Assignability**: `T | undefined` is NOT assignable to `T`. The mutual-assignability
   claim (`old ⇄ new`) only holds after stripping — the `new → old` direction fails
   otherwise (verified: `const toOld: Old = raw` errors
   "Type 'undefined' is not assignable to …").
2. **Concrete consumer bite**: `selectComponentOverrides`' `messages` parameter is
   exactly the old shape `Partial<Record<LocaleName, DeepPartial<Locale>>>`. A bare
   `RegistryI18nOverrides[K]` value cannot be passed to it without stripping
   (verified: `selectComponentOverrides(raw, "AdminShell")` errors; `raw!` passes).
3. **Public-shape preservation**: `AdminLocaleOverrides` / `NoobUiLocaleOverrides` /
   `AdminI18nSnapshot` / `NoobUiI18nSnapshot` keep today's exact type, so
   `satisfies AdminLocaleOverrides` usages and any non-optional consumer keep
   compiling unchanged.

If exact-shape parity did not matter, the bare projection would still be fine in
*optional* positions (`i18n?: RegistryI18nOverrides[K]` — `| undefined` is absorbed)
and `satisfies` expressions still pass; the difference only bites non-optional
consumers (the selector's `messages` param) and strict two-way assignability.
This is why the task keeps `NonNullable` in the public aliases.

The per-locale optionality INSIDE the tree (`overrides.en` is
`DeepPartial<Locale> | undefined`) is identical in both forms and is intended —
a locale may be absent from an override tree. The `NonNullable` touches only the
outer "no entry at all for this library" case, which the registry models with `?`.

### 2. Generic-over-`K` projections COLLAPSE inside generic bodies (the key gotcha)

`RegistryI18nOverrides[K]` and `LibraryOverridesRegistry[K]["locale"]` do **not**
stay symbolic for a generic `K extends keyof LibraryOverridesRegistry`:
- `LibraryOverridesRegistry[K]` eagerly resolves through the constraint union
  including the preseeded `"naive-ui": { locale: unknown; … }`, so
  `RegistryI18nOverrides[K]` degrades to `DeepPartial<unknown>` = `unknown`.
- `RegistryLocaleName<K> = keyof LibraryOverridesRegistry[K]["locale"]` degrades
  to `string | number | symbol` (keyof of the union incl. `keyof unknown`), so
  `RegistryLocale<K> = …[RegistryLocaleName<K>]` degrades to an index-access
  union that fails an `extends object` constraint.

At **concrete** call sites (`K = "noob-naive-ui:admin"`) every projection
resolves exactly (that is what callers see). The degradation only affects
function *bodies*, which must therefore keep their internal types symbolic.

### 3. Working signature (verified)

The derivation helpers now live in the **registry package**
(`packages/registry/src/library-i18n-overrides.ts`, mirror of
`library-theme-overrides.ts`): `RegistryLocaleName<K>`, `RegistryLocale<K>`,
`RegistryI18nLibraryKey`, `RegistryI18nOverridesFor<K>` (design §1). Verified
again with the helpers defined in a sibling module and imported by the proof
(`.scratch-i18n-proof/registry-helpers.ts` + `proof.ts`, RC 0).

```ts
// packages/registry/src/library-i18n-overrides.ts (design §1)
export type RegistryLocaleName<K extends keyof LibraryOverridesRegistry> =
  keyof LibraryOverridesRegistry[K]["locale"];
export type RegistryLocale<K extends keyof LibraryOverridesRegistry> =
  LibraryOverridesRegistry[K]["locale"][RegistryLocaleName<K>];

export type RegistryI18nLibraryKey = {   // libraries with a declared (non-empty) locale schema
  [K in keyof LibraryOverridesRegistry]:
    RegistryLocaleName<K> extends never ? never : K;
}[keyof LibraryOverridesRegistry];

// packages/i18n/src/use-component-i18n.ts (imports the above)
export function createComponentI18n<
  K extends RegistryI18nLibraryKey,
  LocaleName extends RegistryLocaleName<K> = RegistryLocaleName<K>,
  Locale extends object = RegistryLocale<K> & object,   // `& object` keeps the
>                                                       // default inside `extends object`
(options: {
  messages: Readonly<Record<NoInfer<LocaleName>, unknown>>;  // NoInfer: partial messages
  libraryId: K;                                              // must NOT narrow LocaleName
  componentId: NoInfer<keyof Locale & string>;               // NoInfer: componentId must NOT
}): Composer;                                                // infer Locale (default wins)
```

- Secondary `LocaleName`/`Locale` params default from `K`; inside the body they
  are opaque (not degraded), so the existing fully-generic
  `selectComponentOverrides(snapshot, componentId)` call still type-checks.
- `NoInfer` (TS ≥5.4; repo compiles it) on `messages` keeps the
  all-locales-required check (a partial `{ en: … }` no longer narrows
  `LocaleName`); `NoInfer` on `componentId` stops TS from inferring `Locale`
  from the componentId string (which silently widened the check to any string).
- Boundary cast inside the body stays (registry value is loose `unknown`):
  `(registry?.value?.[libraryId]?.i18n ?? emptySnapshot) as Partial<Record<LocaleName, DeepPartial<Locale>>>`.

### 4. Admissibility constraint works

- `"noob-naive-ui:admin"` / `"noob-naive-ui:ui"` / test keys: admissible.
- Preseeded `"naive-ui"` / `"pro-naive-ui"` (`locale: unknown` → `keyof unknown`
  = `never`): excluded from `I18nLibraryKey` → `@ts-expect-error` verified.
- ui package (`Record<never, never>`): admissible key, but `componentId` is
  `never` (empty component set) — matches today's `NoobUiComponentId = never`.

### 5. Cast-free `AdminProvider` indexing

```ts
declare const i18nOverrides: RegistryI18nOverrides | undefined;
const adminEntry: AdminLocaleOverrides | undefined = i18nOverrides?.[adminI18n];
// with `declare const adminI18n: "noob-naive-ui:admin"` — no `as` casts needed.
```
The four `as keyof RegistryI18nOverrides / as keyof AdminPresetThemeOverrides /
as AdminLocaleOverrides | undefined / as NoobUiLocaleOverrides | undefined`
casts in `AdminProvider`'s render disappear.

### 6. i18n-package standalone view compiles

With **no** package augmentations in scope (i18n package's own program: only the
preseeded entries), `I18nLibraryKey` = `never` and every definition still
type-checks (verified with a second scratch file). This matters because the
definitions live in `@noob-naive-ui/i18n`, which never imports admin/ui.

### 7. Test-file augmentation pattern

The i18n package tests must declare their own registry entry locally:

```ts
declare module "@noob-naive-ui/registry" {
  interface LibraryOverridesRegistry {
    "test-library": { locale: Record<TestLocaleName, TestLocale>; theme: {} };
  }
}
```
Verified: `createComponentI18n({ libraryId: "test-library", componentId: "Greeter", … })`
compiles. (Module augmentation is global once the declaring file is part of the program.)

## Runtime-behavior notes

- `selectComponentOverrides` body: `Object.keys(messages) as LocaleName[]` +
  indexing is equivalent to `tsafe/objectEntries` (own enumerable string keys,
  insertion order); one contained cast instead of the `tsafe` dep.
- `tsafe` is used **only** by `library-i18n-descriptor.ts` in the i18n package →
  remove the dependency from `packages/i18n/package.json` after deletion
  (precedent: `tsafe` was already removed from `packages/admin` in session 25).

## Touch-point inventory (from repo grep)

- `packages/registry/src/library-i18n-overrides.ts` — **new**, hosts `RegistryLocaleName` / `RegistryLocale` / `RegistryI18nLibraryKey` (mirror of `library-theme-overrides.ts`); exported from the registry barrel. Public aliases inline `NonNullable<RegistryI18nOverrides["..."]>` (no `RegistryI18nOverridesFor` helper — review decision).
- `packages/registry/tests/library-overrides-registry.test.ts` — add a type-level preseeded-exclusion check (`@ts-expect-error` on `RegistryI18nOverridesFor<"naive-ui">`).
- `packages/i18n/src/library-i18n-descriptor.ts` — delete.
- `packages/i18n/src/use-component-i18n.ts` — import the registry helpers; re-type + absorb `emptySnapshot`/`selectComponentOverrides`.
- `packages/i18n/src/index.ts` — drop the four deleted types; keep `emptySnapshot`/`selectComponentOverrides` re-exports.
- `packages/i18n/tests/library-i18n-descriptor.test.ts` — rewrite as selector/snapshot test (descriptor-shape assertions obsolete).
- `packages/i18n/tests/use-component-i18n.test.tsx` — local augmentation; `descriptor:` → `libraryId:`.
- `packages/i18n/package.json` — remove `tsafe`.
- `packages/admin/src/i18n/plugin.ts` — `adminI18n` → literal const; `AdminI18nSnapshot` re-derived.
- `packages/admin/src/i18n/admin-locale.ts` — `AdminLocaleOverrides` re-derived from registry.
- `packages/admin/src/components/admin-provider.tsx` — drop 4 casts; `libraryId` indexing.
- `packages/admin/src/components/admin-config-provider.tsx` — `adminI18n.libraryId` → `adminI18n`.
- `packages/admin/tests/i18n-contract.test.tsx` — `selectComponentOverrides` import moves to new home (unchanged call sites); `AdminI18nSnapshot` still exported.
- `packages/ui/src/i18n/plugin.ts` — `noobUiI18n` → literal const; aliases re-derived.
- `packages/ui/src/theme/admin-ui-config-provider.tsx` — `noobUiI18n.libraryId` → `noobUiI18n`.
- `packages/registry/src/library-overrides-registry.ts` — doc comment (line ~54) references `LibraryI18nOverrides`; update.
- `.trellis/spec/ui/frontend/library-i18n-contract.md` — §2/§3 descriptor paragraphs rewritten.
- `apps/demo` — no code change (`satisfies AdminLocaleOverrides` usage unaffected; comment in `src/i18n.ts` stays valid).
- `packages/prototype-i18n-verification` — **unaffected** (self-contained, own selector; non-goal since 08-13).
- `dist/**` — stale artifacts; regenerated by builds, never hand-edited.

### 8. GitNexus cross-check of the touch-point inventory (2026-08-15)

Re-indexed the repo (`node .gitnexus/run.cjs analyze`, 1079 nodes / 1966 edges)
and queried the knowledge graph to corroborate the grep inventory:

- `context createComponentI18n` (upstream): incoming calls = `AdminLoginPage`
  (`packages/admin/src/components/admin-login-page.tsx`), `AdminShell`
  (`packages/admin/src/components/admin-shell.tsx`), and the i18n composable
  test `setup` (`packages/i18n/tests/use-component-i18n.test.tsx`); outgoing =
  `selectComponentOverrides`. Flows `AdminLoginPage → SelectComponentOverrides`
  and `AdminShell → SelectComponentOverrides`.
- `impact createComponentI18n` (upstream, incl. tests): 2 direct dependants,
  **risk LOW** — the two admin components; no deeper blast radius.
- `impact selectComponentOverrides` (i18n, upstream, incl. tests, by UID):
  exactly 2 direct dependants — `packages/i18n/tests/library-i18n-descriptor.test.ts`
  (rewritten in this task) and `packages/admin/tests/i18n-contract.test.tsx`
  (import stays `@noob-naive-ui/i18n`, new home). The prototype package's
  `selectComponentOverrides` is a separate symbol (self-contained, untouched).
- All `@noob-naive-ui/i18n` consumers enumerated (10 files + demo): the only
  ones importing the to-be-deleted descriptor types are
  `packages/{admin,ui}/src/i18n/plugin.ts` and
  `packages/admin/src/i18n/admin-locale.ts` — exactly the inventory. Others
  (`getComponentI18n`, `resolveI18nText`, `I18nText`, `i18nTextSchema`,
  `useGlobalI18nSync`) are unaffected.
- Note: GitNexus does not track property-read edges (`adminI18n.libraryId`),
  so the const usages in `admin-provider.tsx` / `admin-config-provider.tsx` /
  `admin-ui-config-provider.tsx` come from the grep pass, not the graph.

Conclusion: the blast radius of deleting `library-i18n-descriptor.ts` is fully
contained to the files listed in the touch-point inventory; risk is LOW.

## 9. Can we hook the registry into naive-ui's locale override? (grounded findings)

**Question** (user, 2026-08-15): naive-ui has its own locale override option — can the
framework-wide override registry drive it?

**Grounded facts (naive-ui@2.44.x source):**
- `NConfigProvider` accepts `locale: NLocale | null` and `dateLocale: NDateLocale | null`
  (`node_modules/naive-ui/es/config-provider/src/ConfigProvider.d.ts` —
  `PropType<NLocale | null>`).
- `ConfigProvider.mjs` does **no internal merge** with a base pack:
  `mergedLocaleRef = computed(() => locale === null ? undefined : locale === undefined ? parent : locale)`.
  So a "locale override" = the host supplies a complete pack; the partial-over-base
  merge is a host-side pattern (`merge({}, enUS, partialOverride)`).
- `NLocale` is a single heterogeneous pack (21 sections: `name`, `global`, `Popconfirm`,
  `Cascader`, `Time`, `DatePicker`, `DataTable`, `Transfer`, `Empty`, `Select`, …) —
  **not** a `Record<LocaleName, Locale>` message tree.
- Today the admin package resolves naive-ui's locale internally and hardcoded:
  `NAIVE_UI_LOCALES: Record<AdminLocaleName, { nLocale, nDateLocale }>` in
  `packages/admin/src/runtime/naive-ui-config.ts`, picked by the shell preference
  locale via `resolveAdminNaiveUiLocale`; there is **no host override seam**.
- naive-ui's theme overrides deliberately do **not** ride the registry
  (they flow via `AdminThemePreset.themeOverrides` → `naiveUiConfig.themeOverrides`,
  the "visual path"); only admin/ui slices live in the registry.

**Why the naive-ui registry entry is `locale: unknown` today:** the registry `locale`
schema field follows the noob convention `locale: Record<LocaleName, Locale>`
(locale-first vue-i18n message tree). naive-ui's locale is a single pack, so it
cannot follow that convention — and `unknown` is exactly what keeps
`RegistryLocaleName<"naive-ui">` = `never`, i.e. what keeps naive-ui out of
`RegistryI18nLibraryKey` (createComponentI18n admissibility). Typing the preseed
(`locale: NLocale`) would make `keyof NLocale` ≠ never → naive-ui becomes an
admissible createComponentI18n library — semantically wrong (naive-ui texts are
consumed by naive-ui's own locale context, not vue-i18n `t()`).

**Design options:**

- **Option A — loose registry slice + boundary cast (recommended).** The naive-ui
  locale override rides the registry `i18n` kind as a loose payload (preseed stays
  `locale: unknown`; exclusion preserved). The typed contract
  (`NaiveUiLocaleOverrides = { locale?: DeepPartial<NLocale>; dateLocale?: DeepPartial<NDateLocale> }`)
  lives in the admin package; the naiveUiConfig computed injects
  `libraryOverridesKey`, reads `registry.value?.["naive-ui"]?.i18n` with the
  established boundary cast, and deep-merges over the preference-resolved base
  pack (`merge({}, nLocale, override.locale)`). Matches the existing
  "registry value loose at the provider boundary; cast at consumption" pattern
  (createComponentI18n, useUiTheme).
- **Option B — typed preseed.** `"naive-ui": { locale: NLocale; theme: GlobalThemeOverrides }`
  gives `RegistryI18nOverrides["naive-ui"] = DeepPartial<NLocale>` (a typed partial
  pack) for free — but naive-ui enters `RegistryI18nLibraryKey` (createComponentI18n
  admissibility) unless the key constraint learns to distinguish a locale-first
  record from a pack (semantic, not structural). dateLocale would need a second
  field, further stretching the schema.

**Open provision question (both options):** who writes the naive-ui slice into the
registry? AdminProvider "provides nothing itself" (per-package ConfigProviders write
their own libraryIds; naive-ui is not a noob package). Candidates: (a) AdminProvider
passes the slice to `useAdminProvider({ naiveUiLocale })` (naiveUiConfig path, like
theme — no registry provision, "hooked" only via the `i18nOverrides` prop typing);
(b) a documented exception: AdminProvider provides the admin-owned naive-ui slice;
(c) a tiny `AdminNaiveUiConfigProvider`. The naiveUiConfig consumer would
`inject(libraryOverridesKey, null)` in all cases so AdminShell and tests see the
same value.

**Scope note:** this is a new feature (host-overridable naive-ui locale) beyond the
descriptor-drop task; it touches the registry preseed semantics and admin config.
Recorded here for the architect's decision; not implemented in this task.

### 9b. `createLocale` / `NPartialLocale` — the naive-ui locale override type (follow-up finding)

The user pointed at naive-ui's `createLocale`. Grounded in naive-ui@2.44 source:

```ts
// naive-ui/es/locales/utils/index.d.ts
export type NPartialLocale = {
  [key in keyof NLocale]+?: { [childKey in keyof NLocale[key]]+?: NLocale[key][childKey] };
};
export declare function createLocale(locale: NPartialLocale, fallbackLocale: NLocale): NLocale;
// naive-ui/es/locales/utils/index.mjs: export function createLocale(locale, fallbackLocale) {
//                                              return merge({}, fallbackLocale, locale); }
```

- `createLocale`'s first parameter is `NPartialLocale` — a **one-level-deep partial** of the
  full `NLocale` pack (every section + child key optional, leaves raw). It is naive-ui's
  official partial-over-base seam (lodash deep merge, returns a complete `NLocale`).
  Both `NPartialLocale` and `createLocale` are re-exported from the `"naive-ui"` main
  barrel (`export * from './locales'` — verified by scratch tsc import).
- **Registry fit**: declare `"naive-ui": { locale: NPartialLocale; theme: GlobalThemeOverrides }`.
  `RegistryI18nOverrides["naive-ui"] = DeepPartial<NPartialLocale>` ≈ `NPartialLocale`
  structurally, so the projection is already the exact `createLocale` input type, and
  the consumer calls `createLocale(registrySlice, basePack)`. This mirrors the theme
  preseed precedent (external libs declare the override form; the uniform conversion
  is a structural no-op).
- **Wrinkle 1 — dateLocale**: `createLocale` covers only `NLocale`; no `createDateLocale`
  / `NPartialDateLocale` exists in naive-ui. The admin consumer must merge the date pack
  manually (`merge({}, nDateLocale, override.dateLocale)`) or the registry entry declares
  both halves (`locale: { locale: NPartialLocale; dateLocale: <derived partial> }`).
- **Wrinkle 2 — createComponentI18n admissibility**: `keyof NPartialLocale` = the 21
  NLocale section keys ≠ `never`, so typing the preseed admits naive-ui (and pro-naive-ui,
  if typed the same) into `RegistryI18nLibraryKey`. The noob
  `Record<LocaleName, Locale>` convention and the pack partial are structurally
  indistinguishable (both homogeneous-ish objects, no index signatures), so there is no
  clean type-level discriminator. The footgun is mild (a `createComponentI18n` call with
  `libraryId: "naive-ui"` compiles but is semantically meaningless), but it removes the
  "preseeded exclusion" property built on `locale: unknown`.
- Open decision for the architect: accept the admissibility change (guardrail becomes
  advisory), or keep naive-ui on the loose boundary-cast slice (Option A in §9) while
  still declaring `locale: NPartialLocale` for the projection typing.

### 9c. Resolution — naive-ui locale hooked into the registry (implemented)

Architect decision (2026-08-15): declare a naive-ui equivalent of `AdminLocale`
that composes the pack and the date pack, and preseed it:

```ts
// packages/registry/src/naive-ui-locale.ts
export interface NaiveUiLocale {
  locale: NPartialLocale;   // createLocale's override form (empirically required)
  dateLocale: NDateLocale;  // full pack; no naive-ui partial date helper exists
}
// preseed: "naive-ui" / "pro-naive-ui" → { locale: NaiveUiLocale; theme: GlobalThemeOverrides }
```

**Why `NPartialLocale`, not `NLocale` (empirical proof):** the registry's
`DeepPartial` recurses on `T[K] extends object`, and functions ARE `object` in
TS — so `DeepPartial<NLocale>` mangles function-typed leaves
(`loadingRequiredMessage`, `total`, `selected`, …) into
`DeepPartial<(label: string) => string>` (an empty mapped type), which is NOT
assignable to `createLocale`'s `NPartialLocale` parameter. `DeepPartial<NPartialLocale>`
is exactly `NPartialLocale`: the optional mapping's `| undefined` on each leaf
shields the function from the `extends object` check. Verified by scratch tsc:
`DeepPartial<NLocale>` → NPartialLocale FAILS; `DeepPartial<NPartialLocale>` →
NPartialLocale compiles cast-free. So full `NLocale` "provides resistance" and
the override form wins — mirroring the theme preseed precedent (override form,
structural no-op).

**Consumer (admin, implemented):**
- `packages/admin/src/runtime/naive-ui-config.ts`: `NaiveUiLocaleOverrides =
  NonNullable<RegistryI18nOverrides["naive-ui"]>` (the derived host override
  tree) + `mergeAdminNaiveUiLocaleOverrides(base, overrides)` — pack half via
  naive-ui's own `createLocale(overrides.locale, base.nLocale)`, date half via
  es-toolkit `merge(merge({}, base.nDateLocale), overrides.dateLocale)`
  (es-toolkit `merge` is 2-arg, not variadic).
- `packages/admin/src/use-admin-provider.ts`: `useAdminProvider(options?:
  { naiveUiLocaleOverrides?: NaiveUiLocaleOverrides })`; `naiveUiConfig`
  merges over the preference-resolved base packs.
- `packages/admin/src/components/admin-provider.tsx`: passes
  `props.i18nOverrides?.["naive-ui"]` (the registry i18n projection, typed by
  the preseed) into `useAdminProvider`. Provision path: direct options
  pass-through (naiveUiConfig is AdminProvider-owned, like theme presets) —
  NOT a runtime registry inject, because AdminProvider's own setup cannot see
  its own `provide` (inject resolves before provide in the same setup).

**Admissibility consequence (accepted):** `keyof NaiveUiLocale` = `"locale" |
"dateLocale"` ≠ never → naive-ui / pro-naive-ui are now members of
`RegistryI18nLibraryKey`. `createComponentI18n` compiles for them but is
semantically meaningless (naive-ui texts are consumed by naive-ui's own locale
context, not vue-i18n) — documented in the registry preseed comment and tests.

## Out of scope (noted for symmetry)

`LibraryThemeDescriptor` / `noobUiTheme` (theme side) still use the
descriptor-handle pattern from `packages/registry/src/library-theme-overrides.ts`;
`useUiTheme` reads `noobUiTheme.libraryId`. The same folding applies there
(`noobUiTheme` → literal, theme schema from `LibraryOverridesRegistry[K]["theme"]`),
but it is deliberately out of scope for this i18n task.
