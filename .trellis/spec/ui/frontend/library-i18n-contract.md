# Component-Library Vue I18n Contract

## 1. Scope / Trigger

Apply this contract when `@noob-naive-ui/ui`, `@noob-naive-ui/admin`, or a source-consuming workspace application adds package-owned localized component text.

The host owns one global Composition API Vue I18n instance. Translating library components own fresh local Composers so identical component keys cannot collide globally. The package plugin, when installed, transports only an immutable startup snapshot of partial overrides and fallback configuration.

## 2. Signatures

```ts
interface PackageI18nPluginOptions {
  fallbackLocale?: string
  messages?: Partial<Record<string, PackagePartialLocale>>
}

app.use(packageI18nPlugin, {
  fallbackLocale: "en",
  messages: packageOverrides,
})

const composer = useI18n({
  useScope: "local",
  inheritLocale: true,
  fallbackRoot: false,
  fallbackLocale: configuredFallback,
})

composer.fallbackLocale.value = configuredFallback
composer.fallbackRoot = false
composer.mergeLocaleMessage("en", englishDefaults)
composer.mergeLocaleMessage("zh-CN", chineseDefaults)
composer.mergeLocaleMessage(locale, componentOverrides)
```

A source-consuming host synchronizes locale only after preference hydration:

```ts
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

- The host must install one `createI18n({ legacy: false })` instance before package components mount. Package plugins never create a Composer or register global messages.
- The preference store is the one-way locale authority: hydrated preference -> global Composer -> inheriting local Composers. Neither Composer belongs in serializable Pinia state.
- Every translating component starts with an empty local Composer, merges its packaged defaults first, then merges only its own override slice. `fallbackRoot` remains false so missing package keys never resolve from host-global messages.
- Vue I18n 11.4.8 initializes an inheriting local Composer's fallback settings from the root. Set `composer.fallbackLocale.value` and `composer.fallbackRoot` immediately after `useI18n()`; supplying only the options is insufficient.
- Package plugin installation must defensively copy caller options. Later caller mutation must not affect mounted or subsequently mounted components.
- Locale resources live at `src/locales/ComponentName/localeName.json`. `@intlify/unplugin-vue-i18n` must include them in both the standalone library build and every source-consuming Vite build.
- Keep `resolveJsonModule: true` for source checking. Public locale interfaces must be self-contained: the current dist-only `unplugin-dts` build does not emit imported JSON resources, so exporting `typeof canonicalJson` leaves a dangling declaration import. Use explicit interfaces or generated self-contained declarations unless the build intentionally ships matching JSON declaration resources.
- Escape literal `@` characters using Vue I18n message syntax; an unescaped `@` is parsed as a linked-message marker and fails precompilation.
- Keep `vue` and `vue-i18n` as library peers and Vite externals. Workspace applications own runtime dependencies.

## 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Host omits global Vue I18n installation | Component setup fails; packages must not create a hidden fallback instance. |
| Package plugin omitted | Bundled defaults render and fallback defaults to `en`. |
| Partial component override installed | Specified leaves override defaults; unspecified siblings remain. |
| Caller mutates options after `app.use()` | Mounted and future component instances retain the installation snapshot. |
| Global locale is unsupported by the package | Local Composer renders configured fallback; global locale stays unchanged. |
| Two components use the same local key | Each resolves from its own local registry; no global collision occurs. |
| Source-consumer Vite include omits package JSON | Build/precompilation verification fails; add the package locale glob to the host plugin. |
| Exported declaration references source JSON absent from `dist` | Declaration contract is invalid; replace it with an explicit/generated self-contained type or ship the resource deliberately. |
| JSON message contains an unescaped literal `@` | Unplugin compilation fails; encode the literal with Vue I18n message syntax. |

## 5. Good, Base, and Bad Cases

- **Good:** component-first JSON; empty local Composer; defaults then component override slice; post-creation fallback correction; immutable plugin snapshot; host preference drives global locale; both build boundaries precompile resources.
- **Base:** host installs only global Vue I18n; package defaults render with `en` fallback and no package-specific setup.
- **Bad:** package messages registered globally; imported JSON passed as the mutable initial `messages` object; package-wide overrides merged into every component; two-way Composer/store synchronization; process-global override registry; exported `typeof json` pointing at an unshipped file.

## 6. Tests Required

- Package typecheck and library build after deleting relevant dependency `dist` outputs.
- Source-consuming application typecheck and build with the package source alias active.
- Inspect declarations: root exports are deliberate and no emitted `.d.ts` imports an absent locale JSON file.
- Inspect build output or transform evidence: package and application both contain precompiled message ASTs.
- Runtime/browser assertions: defaults without plugin; partial override and sibling preservation; caller-mutation isolation; global registry does not receive package messages; supported locale propagation without remount; persisted preference reload; configured and default fallback while global locale remains unchanged.

## 7. Wrong vs Correct

```ts
// Wrong: root inheritance replaces these settings in Vue I18n 11.4.8,
// and exporting typeof en may leave a dangling dist declaration import.
export type ComponentMessages = typeof en
const composer = useI18n({
  useScope: "local",
  inheritLocale: true,
  fallbackRoot: false,
  fallbackLocale: configuredFallback,
  messages: { en },
})
```

```ts
// Correct: self-contained public schema and fresh isolated message registry.
export interface ComponentMessages {
  title: string
  description: string
}

const composer = useI18n({
  useScope: "local",
  inheritLocale: true,
  fallbackRoot: false,
  fallbackLocale: configuredFallback,
})
composer.fallbackLocale.value = configuredFallback
composer.fallbackRoot = false
composer.mergeLocaleMessage("en", en)
composer.mergeLocaleMessage(activeOverrideLocale, componentOverrides)
```
