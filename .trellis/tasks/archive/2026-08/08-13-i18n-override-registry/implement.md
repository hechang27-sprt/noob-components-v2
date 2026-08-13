# Implement: Single i18n override registry across component packages

## Ordered steps

1. **i18n descriptor**: add `LibraryI18nOverridesRegistry` + `libraryI18nOverridesKey`; drop `overridesKey` from `LibraryI18nDescriptor` + `createLibraryI18nDescriptor`; update `index.ts`.
2. **createComponentI18n**: registry lookup by `descriptor.libraryId`.
3. **admin plugin.ts**: remove `adminI18nOverridesKey` + `DEFAULT_SNAPSHOT`; keep `adminI18n` + `AdminI18nSnapshot`.
4. **admin-provider.tsx**: `overrides` → `LibraryI18nOverridesRegistry`; provide cloned registry under `libraryI18nOverridesKey`.
5. **admin index.ts**: drop the two removed exports.
6. **tests**: update `use-component-i18n.test.tsx`, `admin-provider.test.tsx`, `i18n-contract.test.tsx`; add registry-key check in `library-i18n-descriptor.test.ts`.
7. **spec**: `library-i18n-contract.md` registry model; `library-conventions.md` DEFAULT_SNAPSHOT example.
8. **verify**: typecheck/tests/build/lint/format; grep for lingering refs.
9. **commit** + journal (Session), archive task.

## Files touched

- `packages/i18n/src/library-i18n-descriptor.ts`, `use-component-i18n.ts`, `index.ts`
- `packages/i18n/tests/{library-i18n-descriptor,use-component-i18n}.test.*`
- `packages/admin/src/i18n/plugin.ts`, `components/admin-provider.tsx`, `index.ts`
- `packages/admin/tests/{admin-provider,i18n-contract}.test.*`
- `.trellis/spec/ui/frontend/{library-i18n-contract,library-conventions}.md`

## Gotchas

- `AdminI18nSnapshot` stays (hosts/tests use it); only `adminI18nOverridesKey` + `DEFAULT_SNAPSHOT` go.
- Registry lookup casts `snapshot.messages` to the descriptor's typed override tree (consumer-side contract).
- Prototype package untouched (self-contained).
- AdminProvider must not import ui types; registry prop stays loose.
