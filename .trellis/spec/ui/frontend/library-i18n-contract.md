# Component-Library Vue I18n Contract

## 1. Scope / Trigger

Apply this contract when `@noob-naive-ui/ui`, `@noob-naive-ui/admin`, or a source-consuming workspace application adds package-owned localized component text.

The host owns one global Composition API Vue I18n instance, including active locale and fallback locale. Translating library components own fresh local Composers so identical component keys cannot collide globally. The package plugin, when installed, transports only an immutable startup snapshot of partial message overrides.

## 2. Signatures

```ts
interface PackageI18nPluginOptions {
  messages?: Partial<Record<string, PackagePartialLocale>>
}

app.use(packageI18nPlugin, {
  messages: packageOverrides,
})

const composer = useI18n({
  useScope: "local",
  inheritLocale: true,
  fallbackRoot: false,
})

// Vue I18n 11.4.8 inherits fallbackRoot from the root Composer.
composer.fallbackRoot = false
composer.mergeLocaleMessage("en", englishDefaults)
composer.mergeLocaleMessage("zh-CN", chineseDefaults)
composer.mergeLocaleMessage(locale, componentOverrides)
```

A source-consuming host configures fallback globally and synchronizes locale only after preference hydration:

```ts
const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: hostFallbackLocale,
  messages: {},
})

preferences.initialize(options)
watch(
  () => preferences.locale,
  (locale) => {
    i18n.global.locale.value = locale
  },
  { immediate: true },
)
```

## 3. Contracts

- The host must install one `createI18n({ legacy: false })` instance before package components mount. The host owns both active and fallback locale. Package plugins never create a Composer, configure fallback, or register global messages.
- The preference store is the one-way active-locale authority: hydrated preference -> global Composer -> inheriting local Composers. Neither Composer belongs in serializable Pinia state.
- Every translating component starts with an empty local Composer, merges its packaged defaults first, then merges only its own override slice. `fallbackRoot` remains false so missing package keys never resolve from host-global messages.
- Vue I18n 11.4.8 initializes an inheriting local Composer's `fallbackRoot` from the root. Set `composer.fallbackRoot = false` immediately after `useI18n()`. Do not overwrite `composer.fallbackLocale`: the local Composer must inherit the host-owned global fallback.
- Package plugin installation must defensively copy caller options. Later caller mutation must not affect mounted or subsequently mounted components.
- Locale resources live at `src/locales/ComponentName/localeName.json`. A standalone library build precompiles those resources; consumers of the built library do not include library source in host Vite configuration.
- A no-build workspace application that aliases libraries to source must precompile source locale JSON in its own Vite build. Use the repository's shared `createWorkspaceVueI18nPlugin()` preset, which covers conventional app/package locale paths without naming individual libraries. Never hard-code `../../packages/<library>/src/locales/**` in a host.
- Keep `resolveJsonModule: true` for source checking. Public locale interfaces must be self-contained: the current dist-only `unplugin-dts` build does not emit imported JSON resources, so exporting `typeof canonicalJson` leaves a dangling declaration import. Use explicit interfaces or generated self-contained declarations unless the build intentionally ships matching JSON declaration resources.
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
| Two components use the same local key | Each resolves from its own local registry; no global collision occurs. |
| Built-package host adds a library-source include | Remove it; resource precompilation belongs to the library build. |
| Source-consumer Vite preset omits package JSON | Build/precompilation verification fails; update the shared workspace glob convention once rather than configuring each consumer/package pair. |
| Source-consuming host hard-codes a package-relative locale path or imports a package-specific include | Replace it with the shared workspace Vue I18n preset. |
| Exported declaration references source JSON absent from `dist` | Declaration contract is invalid; replace it with an explicit/generated self-contained type or ship the resource deliberately. |
| JSON message contains an unescaped literal `@` | Unplugin compilation fails; encode the literal with Vue I18n message syntax. |

## 5. Good, Base, and Bad Cases

- **Good:** component-first JSON; empty local Composer; defaults then component override slice; local `fallbackRoot` correction; immutable override snapshot; host owns active/fallback locale; standalone library build owns its precompilation; source-consuming workspace uses one shared repository Vite preset.
- **Base:** host installs global Vue I18n with its fallback; package defaults render without package-plugin setup.
- **Bad:** package messages registered globally; package plugin owns fallback locale; local Composer overwrites inherited fallback; imported JSON passed as the mutable initial `messages` object; package-wide overrides merged into every component; two-way Composer/store synchronization; process-global override registry; built consumer includes library source; source consumer hard-codes package layout; exported `typeof json` points at an unshipped file.

## 6. Tests Required

- Package typecheck and library build after deleting relevant dependency `dist` outputs.
- Source-consuming application typecheck and build with package source aliases and the shared workspace Vue I18n preset active.
- Build the source-consuming application after deleting relevant package `dist` output to prove the shared preset requires no dependency prebuild.
- Inspect declarations: root exports are deliberate and no emitted `.d.ts` imports an absent locale JSON file.
- Inspect build output or transform evidence: package and source-consuming application both contain precompiled message ASTs.
- Runtime/browser assertions: defaults without plugin; partial override and sibling preservation; caller-mutation isolation; global registry does not receive package messages; supported locale propagation without remount; persisted preference reload; host-configured fallback while global active locale remains unchanged.

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
// Correct: self-contained public schema, host fallback inheritance, and a
// fresh isolated local message registry.
export interface ComponentMessages {
  title: string
  description: string
}

const composer = useI18n({
  useScope: "local",
  inheritLocale: true,
  fallbackRoot: false,
})
composer.fallbackRoot = false
composer.mergeLocaleMessage("en", en)
composer.mergeLocaleMessage(activeOverrideLocale, componentOverrides)
```

```ts
// Wrong: host knows the package's physical source layout.
resolve(__dirname, "../../packages/admin/src/locales/**")

// Correct inside this monorepo: one shared preset owns workspace locale globs.
createWorkspaceVueI18nPlugin()
```
