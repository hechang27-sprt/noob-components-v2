# Shell Preferences State

## Normalization is the storage boundary

Treat persisted values as `unknown`. `packages/admin/src/runtime/shell-preferences.ts` uses Zod schemas to normalize defaults, locale options, and preference values before state sees them. It trims locale strings, drops malformed locale options, and falls back invalid enum values. A provided nonempty locale remains valid even if it is not in `availableLocales`; only an omitted locale falls back to the first available option or `en`.

Keep this parsing and normalization in the runtime helper. Do not scatter `JSON.parse`, enum casts, or local `typeof` guards through Pinia actions or components.

`loadAdminShellPreferences` removes malformed JSON or invalid persisted payloads and returns cloned defaults. Storage access goes through safe helpers so absent, blocked, or throwing `localStorage` behaves as no persistence. Preserve that SSR/test-safe behavior.

## Persisted versus runtime-only state

The storage key is internal: `@noob-naive-ui/admin:shell-preferences`. Persist only `themeMode`, `fontSize`, `locale`, and `sidebarCollapsed`. `availableLocales` is runtime state supplied by initialization defaults and updateable through `setAvailableLocales`; it must not be serialized. `packages/admin/tests/shell-preferences.test.ts` verifies persistence merge behavior.

`cloneShellPreferences` and the computed `preferences` snapshot clone locale options. The store also exposes the raw `availableLocales` ref, so consumers must not mutate that array directly; use `setAvailableLocales` to retain locale realignment and persistence behavior.

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
