# Shell Preferences — Boundary Rules

> The **current** shell-preferences shape — normalization behavior, persisted-vs-runtime field inventory, theme/size/locale mapping, `PRO_LAYOUT_TABBAR_HEIGHTS` constants, and the Pinia store pattern — is documented in the code wiki at `openwiki/packages/admin/preferences.md` and `openwiki/packages/admin/runtime-stores.md`. This spec sets only the rules to follow when changing it.

## Normalization is the storage boundary

Treat persisted values as `unknown`. `packages/admin/src/runtime/shell-preferences.ts` uses Zod schemas to normalize defaults, locale options, and preference values before state sees them.

Keep this parsing and normalization in the runtime helper. Do not scatter `JSON.parse`, enum casts, or local `typeof` guards through Pinia actions or components.

Storage access goes through safe helpers so absent, blocked, or throwing `localStorage` behaves as no persistence. Preserve that SSR/test-safe behavior.

## Persisted versus runtime-only state

Persist only the documented persistent subset (theme mode, font size, locale, sidebar collapsed). Runtime-only presentation state (theme/provider configs, locale options, size-tier mappings) must never be serialized.

## Shell chrome follows the size tier

`AdminShell`'s header nav buttons and tab strip must not hardcode a `size` prop; they resolve their size from the host's `componentOptions` tier. Removing hardcoded sizes lets the font-size preference resize the top bar. Do not derive tabbar heights with a formula — naive-ui size tiers are discrete; re-measure when naive-ui bumps.

## ProLayout chrome is plain HTML with fixed-height props

pro-naive-ui's `ProLayout` renders plain HTML plus `NScrollbar`; it has **no `size` prop** and creates no nested config provider. Never hardcode ProLayout height props in the component — chrome heights are explicit props emitted as CSS vars, and the prop value must equal the rendered height (content-driven `height: auto` would slide content under the header).

## Sidebar menu uses useLayoutMenu

`AdminShell` drives the sidebar `NMenu` from pro-naive-ui's `useLayoutMenu`. Do NOT override its `onUpdateValue` — its internal handler updates `activeKey` and the expanded-keys watcher follows. NMenu's default `responsive` auto-collapse keeps the sidebar collapse behavior working without a `collapsed` prop.

## Base font for plain HTML content

naive-ui sets `body { font-size: 14px }` statically and does not drive it from `themeOverrides`, so plain (non-naive-ui) HTML content does not scale with the preference by itself. Keep the 13/14/16px mapping in the admin package (`FONT_SIZE_OVERRIDES`); do not duplicate it in hosts.

## Pinia store pattern

Use a setup-style `defineStore` with own fields via refs, a computed `preferences` snapshot, an explicit `initialize(options)` call before relying on hydrated storage, and centralized mutations in explicit setters. Attach one detached, synchronous `$subscribe` persistence handler; during hydration use `runWithoutPersistence` so loading stored values does not immediately write them back. Do not persist through an unguarded watch or add a global Pinia persistence plugin; the package needs injectable storage for tests and non-browser execution.

## Verification

Extend the boundary tests when a new field changes normalization or persistence:

```sh
pnpm --filter @noob-naive-ui/admin test -- shell-preferences
```
