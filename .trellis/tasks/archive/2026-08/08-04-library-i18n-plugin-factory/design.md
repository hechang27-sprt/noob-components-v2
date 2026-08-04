# Design: shared library i18n plugin factory

## Current state

- `packages/admin/src/i18n/plugin.ts`: `adminI18nOverridesKey` (InjectionKey),
  `DEFAULT_SNAPSHOT` (frozen `{ messages: {} }`), `adminI18nPlugin` (defensive
  `structuredClone` copy + `app.provide`), `selectAdminShellOverrides` /
  `selectAdminLoginPageOverrides` (thin wrappers over a private
  `selectComponentOverrides`), private `DeepPartial`.
- `packages/ui/src/i18n/plugin.ts`: same scaffold with `NoobUiComponentId =
  never` (empty component set).
- `packages/admin/src/i18n/admin-locale.ts`: `AdminLocaleName`,
  `AdminComponentId`, `AdminLocale` (component-first full schema, derived
  from `locale-types.generated.ts` `LocaleFileMap`), `AdminLocaleOverrides`
  (locale-first partial tree), private `DeepPartial`.
- `packages/i18n/src/use-component-i18n.ts`:
  `useComponentI18n({ messages, overridesKey, emptySnapshot, selectOverrides })`
  — injects the snapshot, creates the local Composer, merges defaults then
  the component slice.

## Target API

### Factory (`packages/i18n/src/library-i18n-plugin.ts`)

```ts
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Locale-first partial override tree for one component library. */
type LibraryI18nOverrides<LocaleName extends string, Locale extends Record<string, unknown>> =
  Partial<Record<LocaleName, DeepPartial<Locale>>>;

interface LibraryI18nSnapshot<LocaleName extends string, Locale extends Record<string, unknown>> {
  messages: LibraryI18nOverrides<LocaleName, Locale>;
}

interface LibraryI18nPluginOptions<LocaleName extends string, Locale extends Record<string, unknown>> {
  messages?: LibraryI18nOverrides<LocaleName, Locale>;
}

interface LibraryI18nPlugin<LocaleName extends string, Locale extends Record<string, unknown>> {
  /** Vue plugin: defensive-copy options and provide the snapshot under the key. */
  plugin: (app: App, options?: LibraryI18nPluginOptions<LocaleName, Locale>) => void;
  /** Typed injection key of the app-scoped snapshot. */
  overridesKey: InjectionKey<LibraryI18nSnapshot<LocaleName, Locale>>;
  /** Frozen empty snapshot used when the plugin is absent. */
  emptySnapshot: Readonly<LibraryI18nSnapshot<LocaleName, Locale>>;
  /** Generic slice selector: for each locale, pick `messages[locale]?.[componentId]`. */
  selectComponentOverrides: <ComponentId extends keyof Locale & string>(
    messages: LibraryI18nOverrides<LocaleName, Locale>,
    componentId: ComponentId,
  ) => Partial<Record<LocaleName, DeepPartial<Locale[ComponentId]>>>;
}

function createLibraryI18nPlugin<LocaleName extends string, Locale extends Record<string, unknown>>(
  config: { libraryId: string },
): LibraryI18nPlugin<LocaleName, Locale>;
```

Key points:

- **Type parameters are the library's schema, not its overrides**: `Locale`
  is the component-first full message schema (`AdminLocale`), `LocaleName`
  the locale union. `LibraryI18nOverrides` derives the partial tree, so the
  packages never hand-write `DeepPartial` or the override tree shape.
- `componentId` is constrained to `keyof Locale` — component resource stems
  are type-checked against the library's schema (drift-guarded by the
  existing generated-types test).
- The empty-library case (`ui`) instantiates with `Locale = Record<never,
  never>`; `DeepPartial<{}>` = `{}`, so overrides accept only empty slices —
  identical semantics to today's `Partial<Record<NoobUiLocaleName,
  Partial<Record<NoobUiComponentId, never>>>>`.
- The slice selector uses tsafe's `objectEntries` (generic keys) because the
  override tree is a mapped type without an index signature; `Object.entries`
  would need one. `packages/i18n` therefore gains a `tsafe` dependency
  (same `^1.8.12` version admin already uses).
- Symbol description embeds `config.libraryId` for debuggability, mirroring
  today's `"noob-naive-ui:admin-i18n-overrides"`.

### Composable (`packages/i18n/src/use-component-i18n.ts`)

```ts
interface UseComponentI18nOptions<LocaleName extends string, Locale extends Record<string, unknown>> {
  /** Packaged defaults, locale-first resource object. */
  messages: Readonly<Record<LocaleName, unknown>>;
  /** The library plugin descriptor produced by createLibraryI18nPlugin. */
  plugin: LibraryI18nPlugin<LocaleName, Locale>;
  /** The component's resource file stem, selecting its override slice. */
  componentId: keyof Locale & string;
}
```

Body changes: `inject(plugin.overridesKey, plugin.emptySnapshot)`, slice via
`plugin.selectComponentOverrides(snapshot.messages, componentId)`, then the
existing merge loops (defaults → overrides, `Object.entries`) and the
11.4.8 `fallbackRoot` correction. Runtime behavior is identical.

## Package changes

### `packages/admin/src/i18n/plugin.ts` (rewrite)

```ts
export const adminI18n = createLibraryI18nPlugin<AdminLocaleName, AdminLocale>({
  libraryId: "noob-naive-ui:admin",
});
export const adminI18nPlugin = adminI18n.plugin;
export const adminI18nOverridesKey = adminI18n.overridesKey;
export const DEFAULT_SNAPSHOT = adminI18n.emptySnapshot;
export type AdminI18nSnapshot = LibraryI18nSnapshot<AdminLocaleName, AdminLocale>;
export type AdminI18nPluginOptions = LibraryI18nPluginOptions<AdminLocaleName, AdminLocale>;
```

- `adminI18n` (the descriptor) is exported for `useComponentI18n` call sites;
  `adminI18nPlugin` / `adminI18nOverridesKey` / `DEFAULT_SNAPSHOT` keep their
  exact public names and shapes (hosts/tests unaffected).
- `selectAdminShellOverrides` / `selectAdminLoginPageOverrides` are deleted;
  callers use `adminI18n.selectComponentOverrides(messages, "AdminShell")`.

### `packages/admin/src/i18n/admin-locale.ts`

- Delete the private `DeepPartial`; derive
  `AdminLocaleOverrides = LibraryI18nOverrides<AdminLocaleName, AdminLocale>`.

### `packages/admin/src/components/*.tsx`

```ts
const { t } = useComponentI18n({
  messages: adminShellMessages,
  plugin: adminI18n,
  componentId: "AdminShell",
});
```

### `packages/ui/src/i18n/plugin.ts` (rewrite)

```ts
export type NoobUiLocaleName = "en" | "zh-CN";
export type NoobUiComponentId = never;

export const noobUiI18n = createLibraryI18nPlugin<NoobUiLocaleName, Record<never, never>>({
  libraryId: "noob-naive-ui:ui",
});
export const noobUiI18nPlugin = noobUiI18n.plugin;
export type NoobUiI18nSnapshot = LibraryI18nSnapshot<NoobUiLocaleName, Record<never, never>>;
export type NoobUiI18nPluginOptions = LibraryI18nPluginOptions<NoobUiLocaleName, Record<never, never>>;
export type NoobUiLocaleOverrides = LibraryI18nOverrides<NoobUiLocaleName, Record<never, never>>;
```

- `ui` gains `"@noob-naive-ui/i18n": "workspace:*"` dependency + vite
  external; root tsconfig path already exists (admin consumes i18n).

## Rollout / rollback

- Rollout order: i18n package first (additive — factory + composable
  signature), then admin, then ui, then tests — each step keeps the tree
  buildable.
- Rollback: revert the i18n package to the previous composable signature and
  restore the per-package plugin files; all tests green at the rollback
  point before tests were migrated.

## Tradeoffs

- `messages: Readonly<Record<LocaleName, unknown>>` is looser than today's
  per-component slice typing at the composable boundary; precision lives in
  the plugin options type (`LibraryI18nOverrides`), where hosts actually
  type their overrides. The composable only merges runtime values.
- Passing the whole `plugin` descriptor (vs. three options) couples the
  composable to the factory output, which is the point: one transport
  implementation, no per-package wiring to get wrong.
- Keeping `adminI18nPlugin` etc. as re-exported aliases preserves the public
  admin API (parent contract: stable override identifiers and locale names
  are package API) at the cost of three alias lines.
