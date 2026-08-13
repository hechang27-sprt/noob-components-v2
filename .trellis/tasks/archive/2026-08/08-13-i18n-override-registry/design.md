# Design: Single i18n override registry across component packages

## 1. `packages/i18n` — registry + descriptor shrink

`library-i18n-descriptor.ts`:
- Add `LibraryI18nOverridesRegistry`:
  ```ts
  export interface LibraryI18nOverridesRegistry {
    [libraryId: string]: { messages: unknown } | undefined;
  }
  ```
- Add shared key:
  ```ts
  export const libraryI18nOverridesKey: InjectionKey<LibraryI18nOverridesRegistry> =
    Symbol("noob-naive-ui:i18n-overrides-registry");
  ```
- `LibraryI18nDescriptor`: remove `overridesKey`; keep `libraryId`, `emptySnapshot`, `selectComponentOverrides`.
- `createLibraryI18nDescriptor` returns the trimmed descriptor (drop the per-library key creation).

`use-component-i18n.ts` (`createComponentI18n`):
```ts
const registry = inject(libraryI18nOverridesKey, {});
const snapshot = registry[descriptor.libraryId];
const overrides = descriptor.selectComponentOverrides(
  (snapshot?.messages ?? descriptor.emptySnapshot.messages) as LibraryI18nOverrides<LocaleName, Locale>,
  componentId,
);
```
- The registry is loose at the provider boundary; the cast to the descriptor's
  typed override tree is the consumer-side contract (each package knows its own
  schema via its descriptor).

`index.ts`: export `libraryI18nOverridesKey`, `LibraryI18nOverridesRegistry`.

## 2. `packages/admin` — AdminProvider provides the registry

`i18n/plugin.ts`:
- Remove `adminI18nOverridesKey` and `DEFAULT_SNAPSHOT` (vestigial; registry replaces both).
- Keep `adminI18n` (descriptor, `libraryId: "noob-naive-ui:admin"`), `AdminI18nSnapshot`.

`components/admin-provider.tsx`:
- `overrides?: AdminLocaleOverrides` → `overrides?: LibraryI18nOverridesRegistry`.
- Provide the cloned registry under `libraryI18nOverridesKey`:
  ```ts
  provide(libraryI18nOverridesKey, {
    ...Object.fromEntries(
      Object.entries(props.overrides ?? {}).map(([id, snap]) => [
        id, { messages: structuredClone(snap?.messages ?? {}) },
      ]),
    ),
  });
  ```
- Doc: hosts type each registry entry by importing that package's override type
  (`AdminLocaleOverrides` from admin, `NoobUiLocaleOverrides` from ui).

`index.ts`: remove `adminI18nOverridesKey` / `DEFAULT_SNAPSHOT` exports; keep `AdminI18nSnapshot`.

## 3. `packages/ui`

No code change required (`noobUiI18n` descriptor already carries `libraryId: "noob-naive-ui:ui"`; it never referenced `overridesKey`). Its overrides now flow via the same registry — documented.

## 4. Tests

- `packages/i18n/tests/use-component-i18n.test.tsx`: `mount()` provides the registry:
  `app.provide(libraryI18nOverridesKey, { "test-library": { messages: options.overrides } })`.
- `packages/i18n/tests/library-i18n-descriptor.test.ts`: no `overridesKey` refs (only `emptySnapshot`) — unaffected; add a registry-key sanity check (shared, non-colliding).
- `packages/admin/tests/admin-provider.test.tsx` (~209): inject `libraryI18nOverridesKey`, read `registry["noob-naive-ui:admin"]`.
- `packages/admin/tests/i18n-contract.test.tsx`: `captureProviderSnapshot` injects the shared key, returns the admin entry (or `adminI18n.emptySnapshot`); `AdminI18nSnapshot` type kept.

## 5. Spec

- `library-i18n-contract.md`: rewrite the transport paragraphs to the registry model (single shared key, libraryId-keyed; AdminProvider `overrides` prop provides it; per-entry defensive copy).
- `library-conventions.md` (~line 40): the `DEFAULT_SNAPSHOT` public-export example is stale — replace with a still-exported symbol (e.g. `AdminI18nSnapshot`).

## Verification

- i18n tests, admin tests (expect 2 pre-existing theme failures only), admin+ui+i18n+demo typecheck, builds, oxlint, oxfmt.
- Grep: no remaining `adminI18nOverridesKey` / `DEFAULT_SNAPSHOT` / `.overridesKey` outside prototype + docs.
