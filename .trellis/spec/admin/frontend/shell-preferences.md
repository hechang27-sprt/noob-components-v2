# Shell Preferences State

## Normalization is the storage boundary

Treat persisted values as `unknown`. `packages/admin/src/runtime/shell-preferences.ts` uses Zod schemas to normalize defaults, locale options, and preference values before state sees them. It trims locale strings, drops malformed locale options, and falls back invalid enum values. A provided nonempty locale remains valid even if it is not in `availableLocales`; only an omitted locale falls back to the first available option or `en`.

Keep this parsing and normalization in the runtime helper. Do not scatter `JSON.parse`, enum casts, or local `typeof` guards through Pinia actions or components.

`loadAdminShellPreferences` removes malformed JSON or invalid persisted payloads and returns cloned defaults. Storage access goes through safe helpers so absent, blocked, or throwing `localStorage` behaves as no persistence. Preserve that SSR/test-safe behavior.

## Persisted versus runtime-only state

The storage key is internal: `@noob-naive-ui/admin:shell-preferences`. Persist only `themeMode`, `fontSize`, `locale`, and `sidebarCollapsed`. `availableLocales` is runtime state supplied by initialization defaults and updateable through `setAvailableLocales`; it must not be serialized. `packages/admin/tests/shell-preferences.test.ts` verifies persistence merge behavior.

Runtime-only presentation state, never persisted:

- `naiveUiConfig` computed — `{ theme, themeOverrides, locale, componentOptions }` props for the host `n-config-provider`, derived from `themeMode` (incl. system dark via the `systemUsesDark` signal), `fontSize` (px overrides + naive-ui per-component size tier), and `locale` (naive-ui locale via `resolveAdminNaiveUiLocale`, falling back through the host-owned `fallbackLocale` supplied to `initialize`). The font-size preference maps to `componentOptions` (`COMPONENT_SIZE_OPTIONS`) because naive-ui has no single global size prop. Hosts bind it directly: `<n-config-provider v-bind="preferences.naiveUiConfig">`. Mapping functions live in `src/runtime/naive-ui-config.ts`; the store imports them rather than owning naive-ui knowledge.
- `setSystemUsesDark(value)` action — the browser color-scheme signal the host feeds from its `matchMedia` listener; used only by the system-mode theme derivation.
- `fallbackLocale` — host-owned naive-ui fallback authority passed to `initialize({ fallbackLocale })`, default `en`.

Boundary tests must cover the naive-ui config derivation: theme per mode incl. system + `setSystemUsesDark`, size mapping, locale mapping with unsupported-locale fallback, and non-persistence of these runtime-only fields.

`cloneShellPreferences` and the computed `preferences` snapshot clone locale options. The store also exposes the raw `availableLocales` ref, so consumers must not mutate that array directly; use `setAvailableLocales` to retain locale realignment and persistence behavior.

## Shell chrome follows the size tier

`AdminShell`'s header nav buttons and tab strip must not hardcode a `size` prop; they resolve their size from the host's `componentOptions` tier (naive-ui merges `props.size ?? componentOptions.Button.size ?? 'medium'`). Removing the hardcoded sizes lets the font-size preference resize the top bar. `Menu` is not a key in naive-ui's `GlobalComponentConfig`, so the sidebar menu cannot be resized per-component; its text still follows `themeOverrides.common.fontSize`.

## Base font for plain HTML content

naive-ui sets `body { font-size: 14px }` statically and does not drive it from `themeOverrides`, so plain (non-naive-ui) HTML content does not scale with the preference by itself. Hosts should apply `resolveAdminNaiveBaseFontSize(fontSize)` (13/14/16px, exported from the package) to their root element (e.g. `document.documentElement.style.fontSize`) so `rem`-based content scales. Keep the 13/14/16px mapping in the admin package (`FONT_SIZE_OVERRIDES`); do not duplicate it in hosts.

## Pinia store pattern

`packages/admin/src/stores/shell-preferences.ts` uses a setup-style `defineStore` named `admin-shell-preferences`:

- own fields with refs;
- expose a computed `preferences` snapshot;
- call `initialize(options)` before relying on hydrated storage state;
- centralize mutations in explicit setters, `toggleSidebar`, `replacePreferences`, and `reset`;
- realign `locale` when `setAvailableLocales` removes its current key.

Attach one detached, synchronous `$subscribe` persistence handler. During hydration, use `runWithoutPersistence` so loading stored values does not immediately write them back. Do not persist through an unguarded watch or add a global Pinia persistence plugin; the package needs injectable storage for tests and non-browser execution.

## Verification

`packages/admin/tests/shell-preferences.test.ts` covers default hydration, valid persisted merge, persist-field selection, malformed JSON cleanup, and throwing adapters. Preserve those cases and add a boundary test when a new field changes normalization or persistence:

```sh
pnpm --filter @noob-naive-ui/admin test -- shell-preferences
```
