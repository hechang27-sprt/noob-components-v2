# Component-Library Vue I18n Contract

## 1. Scope / Trigger

Apply this contract when `@noob-naive-ui/ui`, `@noob-naive-ui/admin`, or a source-consuming workspace application adds package-owned localized component text.

The host owns one global Composition API Vue I18n instance, including active locale and fallback locale. Translating library components own fresh local Composers so identical component keys cannot collide globally. The package plugin, when installed, transports only an immutable startup snapshot of partial message overrides.

## 2. Signatures

```ts
interface LibraryI18nSnapshot / LibraryI18nPluginOptions are derived by the
factory; the library only supplies its schema.
const libraryI18n = createLibraryI18nPlugin<LocaleName, Locale>({
 libraryId: "noob-naive-ui:admin", // stable per-library identifier
})

app.use(libraryI18n.plugin, { messages: packageOverrides })

// Shared composable (packages/i18n): fresh local Composer inheriting the
// host's root locale and fallback, merged packaged defaults then the
// component's override slice, fallbackRoot already corrected.
const { composer, t, locale } = useComponentI18n({
 messages: componentMessages, // locale-first packaged defaults
 plugin: libraryI18n, // factory descriptor: key + empty snapshot
 componentId: "ComponentName", // resource file stem, selects the slice
})

// One-way store → global Composer synchronization, shell-owned.
const globalComposer = useGlobalI18nSync(() => preferences.locale)
```

A source-consuming host owns locale/fallback and seeds the Composer with the hydrated preference; AdminShell owns all later store → Composer synchronization:

```ts
preferences.initialize({ defaults, fallbackLocale: hostFallbackLocale })
const i18n = createI18n({
  legacy: false,
  locale: preferences.locale,
  fallbackLocale: hostFallbackLocale,
  messages: hostMessages,
})
// No host watcher: AdminShell synchronizes preferences.locale → i18n.global
// with an immediate watcher; the host seed covers the pre-auth login page.
```

## 3. Contracts

- The host must install one `createI18n({ legacy: false })` instance before package components mount. The host owns both active and fallback locale. Package plugins never create a Composer, configure fallback, or register global messages.
- The preference store is the one-way active-locale authority: hydrated preference -> global Composer -> inheriting local Composers. `AdminShell` owns the ongoing store → Composer synchronization via an immediate watcher; the host seeds the Composer with the hydrated preference at startup so pre-auth screens render the restored locale before `AdminShell` mounts. Neither Composer belongs in serializable Pinia state.
- Shared i18n logic lives in the internal `@noob-naive-ui/i18n` package (`packages/i18n`): the `I18nText` primitives (`I18nText`, `i18nTextSchema`, `resolveI18nText`), the composables `useComponentI18n` and `useGlobalI18nSync`, and the plugin factory `createLibraryI18nPlugin<LocaleName, Locale>({ libraryId })`. The factory is the single implementation of the plugin transport (defensive-copy install + provide), the typed injection key, the frozen empty snapshot, and the generic `selectComponentOverrides(messages, componentId)` slice selector; consuming packages instantiate it with their locale schema and re-export the aliases they keep public (`adminI18nPlugin`, `adminI18nOverridesKey`, `DEFAULT_SNAPSHOT`). `useComponentI18n` consumes the descriptor via `{ messages, plugin, componentId }` — no per-package override-key, empty-snapshot, or selector customization.
- Displayable tab titles use the shared `I18nText` discriminated union (`{ kind: "string"; value: string }` or `{ kind: "i18n"; key: string; named?: Record<string, string | number | boolean> }`). `i18n`-kind labels resolve against the host global Composer at render time, so open AND history-restored tabs follow locale switches. The navigation adapter persists the label as its I18nText representation via `i18nTextSchema`; `named` values persist with history state and must stay JSON-serializable primitives.
- Descriptors handed to the navigation adapter must be plain data. `structuredClone` throws `DOMException: Proxy object could not be cloned` on reactive objects, and tab records live in a reactive map — snapshot them to plain copies (`{ ...nav }`, plain label with copied `named`) before requesting navigation.
- Every translating component obtains its registry from `useComponentI18n`: a fresh local Composer, packaged defaults merged first, then only its own override slice. `fallbackRoot` remains false so missing package keys never resolve from host-global messages.
- Vue I18n 11.4.8 initializes an inheriting local Composer's `fallbackRoot` from the root. Set `composer.fallbackRoot = false` immediately after `useI18n()`. Do not overwrite `composer.fallbackLocale`: the local Composer must inherit the host-owned global fallback.
- Package plugin installation must defensively copy caller options. Later caller mutation must not affect mounted or subsequently mounted components.
- Locale resources live at `src/locales/<ComponentName>.json`. Each component file is a locale-first object whose top-level keys are all supported locale identifiers and whose values share that component's message schema. A standalone library build precompiles those resources; consumers of the built library do not include library source in host Vite configuration.
- `createWorkspaceVueI18nPlugin()` is optional monorepo development tooling for applications that alias libraries to source. It applies the repository-wide locale transform and component-scoped locale-file HMR without naming individual libraries. The application dev server and production build must still work when the preset is omitted; omission only removes locale-file HMR and this shared development transform. Never hard-code `../../packages/<library>/src/locales/**` in a host.
- Standalone library builds own production locale precompilation. Consumers of built package output configure no workspace locale preset; production correctness must never depend on `createWorkspaceVueI18nPlugin()`.
- When installed, the shared workspace preset records static relative JSON imports before Intlify resolves them to virtual modules, invalidates affected precompiled virtual dependencies, and returns only their Vue component importers as HMR boundaries. Keep this generic to conventional workspace locale paths; do not add component-level HMR registries.
- Keep `resolveJsonModule: true` for source checking. Public locale message types are generated from the resources by the shared `tooling/vite/json-locale-types` plugin: it scans a locale directory for `*.json` files and emits a committed TS module (one widened interface per file plus a file-stem → type map) under the package's `src/`. The library registers `createJsonLocaleTypesPlugin` (build-time `buildStart` generation); dev-facing apps register `createJsonLocaleTypesWatcherPlugin` pointed at the library's locale directory to regenerate on locale JSON changes during dev servers. The generated module is excluded from Prettier (the generator owns its formatting). Because it lives under `src/`, the dist-only `unplugin-dts` build emits a sibling `dist/locales/*.generated.d.ts` and exported types stay resolvable for consumers. Do not hand-declare message-shape interfaces (they drift); derive them from the generated map (e.g. `LocaleFileMap["AdminShell"]["en"]`). Never export `typeof <json import>`: the declaration build does not emit JSON modules, leaving a dangling declaration import.
- The generated file is committed and drift-guarded: a test regenerates from the live resources and asserts byte equality, so editing JSON without rebuilding fails the suite. Name collisions and JSON parse errors fail the generating build loudly.
- Escape literal `@` characters using Vue I18n message syntax; an unescaped `@` is parsed as a linked-message marker and fails precompilation.
- Keep `vue` and `vue-i18n` as library peers and Vite externals. Workspace applications own runtime dependencies.

## 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Host omits global Vue I18n installation | Component setup fails; packages must not create a hidden fallback instance. |
| Package plugin omitted | Bundled defaults render using the host global fallback. |
| Partial component override installed | Specified leaves override defaults; unspecified siblings remain. |
| Caller mutates options after `app.use()` | Mounted and future component instances retain the installation snapshot. |
| Global locale is unsupported by the package | Local Composer renders the host-configured global fallback; global active locale stays unchanged. |
| `i18n`-kind tab label with a locale switch | The shell resolves the label against the global Composer at render time; open and restored tabs follow the locale. |
| Restored history entry carries an `i18n`-kind label | It renders through the message key in the current locale; `string`-kind labels render verbatim. |
| Reactive tab descriptor handed to the navigation adapter | Snapshot to plain data first; `structuredClone` cannot clone Vue reactive proxies. |
| Two components use the same local key | Each resolves from its own local registry; no global collision occurs. |
| Built-package host adds a library-source include | Remove it; resource precompilation belongs to the library build. |
| Workspace preset omitted | Source-consuming dev server and production build still work; locale-file HMR and the shared development transform are unavailable. |
| Source-consuming host hard-codes a package-relative locale path or imports a package-specific include | Remove the package-specific include; use the optional shared preset when monorepo locale HMR is wanted. |
| Workspace locale edit leaves mounted source-consumed components stale | The preset must invalidate the Intlify virtual dependency before returning its Vue component importer; refreshing only the component reuses stale precompiled messages. One flat component file can update any supported locale without reloading the document. |
| Exported declaration references source JSON absent from `dist` | Declaration contract is invalid; replace it with a generated self-contained type (committed TS module under `src/`, emitted as a sibling d.ts) or ship the resource deliberately. |
| Locale JSON edited without regenerating the committed type module | The drift-guard test fails; rebuild the package (or run the generator) to refresh the module. |
| Two JSON stems map to the same type name | The generator fails the build with the colliding stems; rename a file or supply a custom `typeName`. |
| JSON message contains an unescaped literal `@` | Unplugin compilation fails; encode the literal with Vue I18n message syntax. |

## 5. Good, Base, and Bad Cases

- **Good:** one locale-first `src/locales/<ComponentName>.json` resource per translating component; empty local Composer; iterate packaged locale entries, then merge the component override slice; local `fallbackRoot` correction; immutable override snapshot; host owns active/fallback locale; standalone library build owns production precompilation; a source-consuming workspace may opt into one shared preset for development transforms and component-scoped locale HMR.
- **Base:** host installs global Vue I18n with its fallback; package defaults render without package-plugin setup; source-consuming dev/build works without the optional workspace preset.
- **Bad:** package messages registered globally; package plugin owns fallback locale; local Composer overwrites inherited fallback; imported JSON passed as the mutable initial `messages` object; package-wide overrides merged into every component; two-way Composer/store synchronization; process-global override registry; built consumer includes library source; source consumer hard-codes package layout; production correctness depends on the workspace preset; exported `typeof json` points at an unshipped file; locale HMR refreshes the document or returns a component while leaving its virtual locale dependency cached.

## 6. Tests Required

- Package unit/component tests: defensive installation snapshot, caller-mutation isolation, component/locale override selection, partial override sibling preservation, and host-owned fallback with unsupported active locale unchanged.
- Package typecheck and standalone library build after deleting relevant dependency `dist` outputs.
- Source-consuming application typecheck and build both with and without the optional workspace preset; both paths must succeed.
- Build the source-consuming application after deleting relevant package `dist` output to prove the source alias requires no dependency prebuild.
- Inspect declarations: root exports are deliberate and no emitted `.d.ts` imports an absent locale JSON file.
- Inspect standalone package build output for precompiled message ASTs; production consumers rely on package output, not the workspace preset.
- Runtime/browser assertions: defaults without plugin; global registry does not receive package messages; supported locale propagation without remount; persisted preference reload.
- When the optional preset is enabled during source-consumer development, edit and restore messages for at least two locale entries in the flat component resource; assert rendered messages update while a page-lifetime marker and unrelated application state remain unchanged.

## 7. Wrong vs Correct

```ts
// Wrong: package fallback competes with host authority, root messages remain
// reachable, and exporting typeof en may leave a dangling dist import.
export type ComponentMessages = typeof en
const composer = useI18n({
  useScope: "local",
  inheritLocale: true,
  fallbackLocale: packageFallback,
  messages: { en },
})
composer.fallbackLocale.value = packageFallback
```

```ts
// Correct: self-contained public schema, locale-first component resource,
// host fallback inheritance, and a fresh isolated local message registry —
// obtained through the shared composable.
export interface ComponentMessages {
  title: string
  description: string
}

const componentMessages = {
  en: { title: "Title", description: "Description" },
  "zh-CN": { title: "标题", description: "描述" },
}

const { composer, t } = useComponentI18n({
  messages: componentMessages,
  overridesKey: packageI18nOverridesKey,
  emptySnapshot: DEFAULT_SNAPSHOT,
  selectOverrides: selectComponentOverrides,
})
```

```ts
// Wrong: host knows one package's physical source layout, or production
// correctness depends on monorepo-only tooling.
resolve(__dirname, "../../packages/admin/src/locales/**")

// Correct inside this monorepo: optionally install one shared development
// preset for source-locale transforms and HMR. Built consumers omit it.
createWorkspaceVueI18nPlugin()
```
