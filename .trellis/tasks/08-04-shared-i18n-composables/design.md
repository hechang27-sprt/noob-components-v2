# Design: shared i18n composables in @noob-naive-ui/i18n

## 1. Package scaffold

New workspace package `packages/i18n` → `@noob-naive-ui/i18n`, `private: true`,
mirroring the admin package conventions:

- `package.json`: `main/module/types → ./dist/index.js|.d.ts`, exports map,
  dependencies `vue: catalog:`, `vue-i18n: catalog:`, `zod: catalog:`,
  `tsafe: ^1.8.12` (all `workspace:*` peers none — it is the base package).
- `vite.config.ts`: lib build (`src/index.ts`, `formats: ["es"]`), `dts()`
  with `tsconfig.build.json`, external `vue`, `vue-i18n`, `zod`, `tsafe`.
  No `vueI18n` unplugin — this package bundles no locale JSON (component
  messages stay in the consuming packages).
- `tsconfig.json` extends `../../tsconfig.library.json` with
  `paths: { "@noob-naive-ui/i18n": ["../i18n/src/index.ts"] }` (rootDir
  `../..` like admin). Root `tsconfig.json` paths gains the same entry.
- `pnpm-workspace.yaml`: add `packages/i18n`.
- `tsconfig.build.json` / tests dir per admin's layout
  (`tests/**/*.test.{ts,tsx}`, node environment).

## 2. Files and API

### `src/i18n-text.ts` (moved from admin, renamed)

- `i18nTextSchema` — the Zod discriminated union currently exported as
  `adminI18nTextSchema`; body unchanged (string value | i18n key + optional
  `named` primitives). Rename is required: the `admin` prefix is wrong in a
  shared package.
- `type I18nText = z.infer<typeof i18nTextSchema>`.
- `resolveI18nText(text, translate)` — unchanged.
- admin's `src/i18n/i18n-text.ts` is deleted; the barrel re-export removed
  (clean cutover, no alias).

### `src/use-component-i18n.ts`

```ts
export interface UseComponentI18nOptions<S, Slice> {
  /** Packaged defaults, locale-first resource object (e.g. { en, "zh-CN" }). */
  messages: Readonly<Record<string, unknown>>;
  /** Injection key of the app-scoped override snapshot tree. */
  overridesKey: InjectionKey<S>;
  /** Frozen empty snapshot used when no plugin installed the key. */
  emptySnapshot: S;
  /** Extracts this component's override slice from the snapshot. */
  selectOverrides: (snapshot: S) => Slice;
}

export interface UseComponentI18nReturn {
  /** The fresh local Composer (fallbackRoot already corrected). */
  composer: Composer;
  /** Bound translator rendering merged defaults + overrides. */
  t: Composer["t"];
  /** The Composer's reactive active locale (inherits the root). */
  locale: Ref<string>;
}
```

Behavior (verbatim port of the current duplicated block):

1. `inject(overridesKey, emptySnapshot)`.
2. `useI18n({ useScope: "local", inheritLocale: true, fallbackRoot: false })`.
3. Post-creation `composer.fallbackRoot = false` (vue-i18n 11.4.8 quirk:
   with `__root && inheritLocale` the local Composer initializes fallback
   from the root; keep the inherited fallback locale but disable
   root-message fallback so missing package keys never resolve from
   host-global registries).
4. Destructure `mergeLocaleMessage`/`t` (with the documented
   `oxlint-disable-next-line typescript/unbound-method`).
5. Merge `objectEntries(messages)` per locale (packaged defaults first).
6. Merge `objectEntries(selectOverrides(snapshot))` per locale, guarding
   `!== undefined` (the type keeps locale keys optional), so overrides win
   at the leaf.
7. Return `{ composer, t, locale: composer.locale }`.

Typing note: `tsafe.objectEntries<O extends Record<string, any>>` — the
`any` constraint accepts any object type, so both merge loops stay
cast-free with inferred `M`/`Slice` generics. `mergeLocaleMessage` is
generic over its message tree; concrete JSON-module values and typed
partial slices compile exactly as they do at the two current callsites.

### `src/use-global-locale-sync.ts`

```ts
export function useGlobalLocaleSync(
  source: Ref<string>,
  options?: { immediate?: boolean },
): void
```

`useI18n({ useScope: "global" })`, then `watch(source, (locale) =>
globalComposer.locale.value = locale, { immediate: options?.immediate ??
true })`. Ports the AdminShell store→Composer one-way watcher verbatim
(store locale remains the authority; no reverse sync).

### `src/index.ts`

Exports `I18nText`, `i18nTextSchema`, `resolveI18nText`,
`useComponentI18n`, `useGlobalLocaleSync` and their option/return types.

## 3. Admin refactor

`src/i18n/plugin.ts` keeps the admin-typed plugin contract (snapshot type,
`adminI18nOverridesKey`, `DEFAULT_SNAPSHOT`, `selectComponentOverrides` +
the two component selectors, `adminI18nPlugin`) — these are the plugin's
public typed surface and cannot move without breaking the plugin options
contract. The composable consumes them generically.

- `admin-shell.tsx`: the L221-265 block becomes
  `const { composer, t, locale } = useComponentI18n({ messages:
  adminShellMessages, overridesKey: adminI18nOverridesKey, emptySnapshot:
  DEFAULT_SNAPSHOT, selectOverrides: selectAdminShellOverrides })` plus
  `useGlobalLocaleSync(() => preferences.locale)` replacing the manual
  globalComposer + watcher. `resolveI18nText` label rendering switches to
  the composable's global-Composer translator — the shell still needs its
  own `useI18n({ useScope: "global" })` for that (returned by
  `useGlobalLocaleSync`? see risk 3).
- `admin-login-page.tsx`: the L61-105 block becomes the same
  `useComponentI18n` call with `AdminLoginPage` messages/selector; drop the
  manual composer + merge loops.
- `src/index.ts`: remove the `adminI18nTextSchema`/`resolveI18nText`/
  `I18nText` re-exports; import the type from the new package where the
  descriptor contract needs it.

## 4. admin-vue-router

- `navigation.ts`/`create-admin-router.ts`: `adminI18nTextSchema` import →
  `i18nTextSchema` from `@noob-naive-ui/i18n`. `AdminShellTabDescriptor`
  stays an admin type import (router depends on the admin descriptor
  contract — pre-existing arrangement; declaring the dep is the fix here).
- Declare `"@noob-naive-ui/i18n": "workspace:*"` (the package currently
  declares NO dependencies despite importing `@noob-naive-ui/admin` —
  declaring the real graph for the new import is in scope; the undeclared
  admin dep is left as-is, noted in the summary).

## 5. Dependency wiring

- `packages/admin/package.json` + `packages/admin-vue-router/package.json`:
  add `"@noob-naive-ui/i18n": "workspace:*"`.
- Root `tsconfig.json` paths + admin tsconfig paths (admin already maps
  `@noob-naive-ui/ui` → src; add the i18n map for source-based typecheck).
- Admin vite config: no alias needed if the build externalizes
  `@noob-naive-ui/i18n` (workspace resolution); add to `rolldownOptions.external`.

## 6. Tests

New `packages/i18n/tests/`:

- `use-component-i18n.test.tsx`: a test app providing the overrides key
  with a partial tree; assert (a) packaged defaults render, (b) override
  slice wins at the leaf while siblings survive, (c) absent plugin →
  defaults render (empty-snapshot path), (d) `composer.fallbackRoot ===
  false` after setup, (e) returned `t` translates merged messages, (f)
  returned `locale` follows a root-locale switch.
- `use-global-locale-sync.test.tsx`: mount harness with a root Composer;
  assert watching a ref writes it into `i18n.global.locale.value` (immediate
  and on change), and non-immediate option defers the first write.
- `i18n-text.test.ts`: schema acceptance/rejection (bad `kind`, non-primitive
  `named`) + `resolveI18nText` string/i18n branches — moved from the admin
  contract tests.

Admin/router existing tests (51 + 69) are the regression net for the
refactor; no label/schema semantics change.

## 7. Risks

1. **`mergeLocaleMessage` typing** — generic message trees from inferred
   `M`/`Slice`; the current callsites compile with concrete types, so the
   generic version should too; if the vue-i18n types fight inference,
   constrain `M`/`Slice` to `Record<string, unknown>` and iterate via
   `objectEntries` (the `any` constraint) — no casts needed.
2. **`composer.locale` type** — `Composer["locale"]` is `WritableComputedRef<Locale>`; `Locale = string` in the current vue-i18n types, so `Ref<string>` return is sound; adjust to `WritableComputedRef<string>` if the emitted d.ts disagrees.
3. **Shell's global Composer** — `useGlobalLocaleSync` currently returns
   `void`; the shell needs the global Composer's `t` for label resolution.
   Option A: return it from `useGlobalLocaleSync` (rename to
   `useGlobalI18nSync` returning the Composer); Option B: the shell keeps a
   one-line `useI18n({ useScope: "global" })`. Prefer A — one composable,
   no leftover setup. Decision: A.
4. **TSX in tests** — new package tests use TSX + `mount` from
   `@vue/test-utils` per admin test conventions; vueJsx plugin needed in the
   new package's vite test config (copy admin's).
5. **pnpm install** — new workspace member needs `pnpm install` to link
   `@noob-naive-ui/i18n` before typecheck/builds resolve it.
