# Implement — drop `library-i18n-descriptor.ts`; registry-keyed `createComponentI18n`

Ordered, independently verifiable steps. Validate after each. Baseline: clean tree.

## Step 0 — Re-run the type proof

Keep/restore the scratch proof (`.scratch-i18n-proof/proof.ts` + `degenerate.ts`,
git-excluded) and confirm `npx tsc -p .scratch-i18n-proof/tsconfig.json` is green
for both files before touching source. This is the signature contract.

## Step 1 — registry package: host the i18n derivation (mirror of `library-theme-overrides.ts`)

New `packages/registry/src/library-i18n-overrides.ts` with `RegistryLocaleName<K>`,
`RegistryLocale<K>`, `RegistryI18nLibraryKey` exactly as in `design.md` §1 (type-only; imports `LibraryOverridesRegistry` +
`RegistryI18nOverrides` from the sibling `library-overrides-registry.ts` — no cycle).

`packages/registry/src/index.ts`: export the three new types.

**Validate:** `pnpm --filter @noob-naive-ui/registry typecheck && test` (barrel
test untouched; add a registry test asserting `RegistryI18nLibraryKey` excludes the preseeded keys at type level via
`@ts-expect-error` — preseeded exclusion).

## Step 2 — i18n package: re-type `createComponentI18n`, absorb the selector/snapshot, delete the descriptor file

`packages/i18n/src/use-component-i18n.ts`:
- Import `RegistryLocaleName`, `RegistryLocale`, `RegistryI18nLibraryKey` from
  `@noob-naive-ui/registry` (no local copies) and use the new signature from
  `design.md` §1a:
  ```ts
  export function createComponentI18n<
    K extends RegistryI18nLibraryKey,
    LocaleName extends RegistryLocaleName<K> = RegistryLocaleName<K>,
    Locale extends object = RegistryLocale<K> & object,
  >(options: {
    messages: Readonly<Record<NoInfer<LocaleName>, unknown>>;
    libraryId: K;
    componentId: NoInfer<keyof Locale & string>;
  }): Composer
  ```
- Options: `descriptor` → `libraryId`; snapshot cast target
  `LibraryI18nOverrides<LocaleName, Locale>` → `Partial<Record<LocaleName, DeepPartial<Locale>>>`;
  selector call unchanged.
- Move `emptySnapshot` and `selectComponentOverrides` into this file
  (signature unchanged; body: `Object.keys(messages) as LocaleName[]` + index,
  keep the undefined guard; drop the `tsafe/objectEntries` import).
- Remove the `descriptor`/`libraryId` from `CreateComponentI18nOptions` — replace
  with the new shape above (keep the exported name).

`packages/i18n/src/index.ts`: drop `LibraryI18nDescriptor`, `LibraryI18nOverrides`,
`LibraryI18nSnapshot`, `LibraryI18nComponentSelector` from the barrel; keep
`emptySnapshot` + `selectComponentOverrides` exports (now from
`use-component-i18n.ts`).

Delete `packages/i18n/src/library-i18n-descriptor.ts`.

`packages/i18n/package.json`: remove `tsafe` (verify no other `tsafe` import
remains in `packages/i18n/src`).

**Validate:** `pnpm --filter @noob-naive-ui/i18n typecheck` — expected red ONLY
in the i18n tests (callers still use the old option shape) and in admin/ui
(they still import the deleted types). Registry green from Step 1.

## Step 3 — i18n tests

- `packages/i18n/tests/use-component-i18n.test.tsx`: file-local
  `declare module "@noob-naive-ui/registry"` for `"test-library"`
  (`{ locale: Record<TestLocaleName, TestLocale>; theme: {} }`); delete
  `testDescriptor`; `descriptor: testDescriptor` → `libraryId: "test-library"`;
  `TestOverrides = LibraryI18nOverrides<…>` → `NonNullable<RegistryI18nOverrides["test-library"]>`.
  Add `// @ts-expect-error` compile-time checks: unknown component id, partial
  messages (missing a locale), preseeded `"naive-ui"` libraryId.
- `packages/i18n/tests/library-i18n-descriptor.test.ts` → rename/rewrite as
  `library-i18n-selector.test.ts`: keep `emptySnapshot` frozen + `selectComponentOverrides`
  slice/absent-locale checks; drop descriptor-shape assertions.

**Validate:** `pnpm --filter @noob-naive-ui/i18n typecheck && test`.

## Step 4 — admin package: derive aliases, literal const, cast-free provider

- `packages/admin/src/i18n/admin-locale.ts`: `AdminLocaleOverrides` =
  `NonNullable<RegistryI18nOverrides["noob-naive-ui:admin"]>` (import type from
  `@noob-naive-ui/registry`; drop the i18n `LibraryI18nOverrides` import).
- `packages/admin/src/i18n/plugin.ts`: `adminI18n` = `"noob-naive-ui:admin" as const`;
  `AdminI18nSnapshot` = `NonNullable<RegistryI18nOverrides["noob-naive-ui:admin"]>`;
  drop `LibraryI18nDescriptor` / `LibraryI18nSnapshot` imports.
- `packages/admin/src/components/admin-config-provider.tsx`:
  `[adminI18n.libraryId]` → `[adminI18n]`; doc comment referencing
  `LibraryI18nOverrides` reworded.
- `packages/admin/src/components/admin-provider.tsx`: replace the 4 casts with
  direct indexing: `props.i18nOverrides?.[adminI18n]`,
  `props.i18nOverrides?.[noobUiI18n]`,
  `provider.activeTheme.value?.themeOverrides?.[adminI18n]`,
  `provider.activeTheme.value?.themeOverrides?.[noobUiI18n]` (drop
  `RegistryI18nOverrides`/`AdminPresetThemeOverrides` key casts and the
  per-package value casts; keep imports only where still used).

**Validate:** `pnpm --filter @noob-naive-ui/admin typecheck`; `pnpm --filter
@noob-naive-ui/admin test` (i18n-contract + admin-provider suites).

## Step 5 — ui package: literal const, derived aliases

- `packages/ui/src/i18n/plugin.ts`: `noobUiI18n` = `"noob-naive-ui:ui" as const`;
  `NoobUiI18nSnapshot` / `NoobUiLocaleOverrides` derive from
  `NonNullable<RegistryI18nOverrides["noob-naive-ui:ui"]>`; drop
  `LibraryI18nDescriptor` / `LibraryI18nOverrides` / `LibraryI18nSnapshot` imports.
- `packages/ui/src/theme/admin-ui-config-provider.tsx`: `[noobUiI18n.libraryId]`
  → `[noobUiI18n]`.

**Validate:** `pnpm --filter @noob-naive-ui/ui typecheck`; ui tests if any touch
the i18n aliases.

## Step 6 — registry doc comment + spec doc

- `packages/registry/src/library-overrides-registry.ts` (~line 54): the
  "structurally the library's `LibraryI18nOverrides` override tree" comment →
  describe the projection as the registry's own override tree (no
  `LibraryI18nOverrides` reference), and point the per-library derivation
  helpers at `library-i18n-overrides.ts`.
- `.trellis/spec/ui/frontend/library-i18n-contract.md` §2 signature block + §3:
  descriptor handle → registry-keyed `createComponentI18n({ messages, libraryId,
  componentId })`; note locale schema is declared once in `LibraryOverridesRegistry`
  and consumed via `RegistryI18nOverrides`.

**Validate:** prose only; no typecheck impact.

## Step 6b — naive-ui locale override hooked into the registry (architect-directed add-on)

- New `packages/registry/src/naive-ui-locale.ts`: `NaiveUiLocale` (`locale:
  NPartialLocale` — empirically required, see research §9c; `dateLocale:
  NDateLocale`); export from the barrel.
- `packages/registry/src/library-overrides-registry.ts`: preseed
  `"naive-ui"`/`"pro-naive-ui"` → `locale: NaiveUiLocale`; update the doc
  comment (override-form story like `GlobalThemeOverrides`).
- `packages/registry/tests/library-overrides-registry.test.ts`: flip the
  preseed-exclusion test to assert the typed preseed + admissibility.
- `packages/admin/src/runtime/naive-ui-config.ts`: `NaiveUiLocaleOverrides =
  NonNullable<RegistryI18nOverrides["naive-ui"]>` +
  `mergeAdminNaiveUiLocaleOverrides(base, overrides)` (`createLocale` for the
  pack; es-toolkit `merge(merge({}, base), overrides)` — 2-arg — for the date).
- `packages/admin/src/use-admin-provider.ts`: `UseAdminProviderOptions` +
  `naiveUiLocaleOverrides` param; `naiveUiConfig` merges over the
  preference-resolved base packs.
- `packages/admin/src/components/admin-provider.tsx`: pass
  `props.i18nOverrides?.["naive-ui"]` into `useAdminProvider`.
- Tests: `use-admin-provider.test.ts` gains a naive-ui locale overrides
  describe (pack merge via createLocale, date merge, no-override identity,
  naiveUiConfig surfacing). Note: es-toolkit `merge` deep-clones nested
  objects — assert deep equality for cloned leaves.
- i18n composable test: repurpose the naive-ui `@ts-expect-error` (now a
  derived-schema rejection, not an exclusion).

**Validate:** registry typecheck+test; admin typecheck+test; rebuild registry
dist before admin-vue-router/demo typechecks (they resolve the registry via
dist types).

## Step 7 — Full verification

- `pnpm --filter @noob-naive-ui/registry typecheck && test`
- `pnpm --filter @noob-naive-ui/i18n typecheck && test && build`
- `pnpm --filter @noob-naive-ui/ui typecheck && test && build`
- `pnpm --filter @noob-naive-ui/admin typecheck && test`
- `pnpm --filter @noob-naive-ui/admin-vue-router typecheck && test` (imports i18n schema via `i18n-text`, verify unaffected)
- demo typecheck + build
- Workspace: `tsc -b --noEmit`, `pnpm oxlint`, `pnpm format:check`
- Grep (excluding `dist`/`.scratch-i18n-proof`): zero remaining
  `LibraryI18nDescriptor|LibraryI18nOverrides|LibraryI18nSnapshot|LibraryI18nComponentSelector|library-i18n-descriptor`
  in `packages/` and `apps/`; zero `adminI18n.libraryId|noobUiI18n.libraryId`;
  zero `tsafe` in `packages/i18n/package.json` and `packages/i18n/src`.
- Delete `.scratch-i18n-proof/` (proof served its purpose; findings are recorded
  in `research/type-proof.md`).

## Review gates

- Before Step 2: Step 1 green (registry package hosts + exports the derivation helpers).
- Before Step 3: Step 2's signature contract matches `research/type-proof.md` §3.
- Before Step 4: i18n typecheck+test green (Steps 2–3).
- Before Step 7: Steps 4–6 green.
- Final: Step 7 all green; every `prd.md` acceptance criterion met.

## Rollback

Coordinated source revert of Steps 1–6 (registry helpers + barrel, i18n
signature + barrel, admin/ui aliases + provider, registry comment, spec doc). No runtime value shape, key,
provider, or behavior changed, so rollback is a pure source revert. No release
before approval.
