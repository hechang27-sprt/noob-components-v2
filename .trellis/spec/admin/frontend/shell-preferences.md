# Shell Preferences State

## Normalization is the storage boundary

Treat persisted values as `unknown`. `packages/admin/src/runtime/shell-preferences.ts` uses Zod schemas to normalize defaults, locale options, and preference values before state sees them. It trims locale strings, drops malformed locale options, and falls back invalid enum values. A provided nonempty locale remains valid even if it is not in `availableLocales`; only an omitted locale falls back to the first available option or `en`.

Keep this parsing and normalization in the runtime helper. Do not scatter `JSON.parse`, enum casts, or local `typeof` guards through Pinia actions or components.

`loadAdminShellPreferences` removes malformed JSON or invalid persisted payloads and returns cloned defaults. Storage access goes through safe helpers so absent, blocked, or throwing `localStorage` behaves as no persistence. Preserve that SSR/test-safe behavior.

## Persisted versus runtime-only state

The storage key is internal: `@noob-naive-ui/admin:shell-preferences`. Persist only `themeMode`, `fontSize`, `locale`, and `sidebarCollapsed`. `availableLocales` is runtime state supplied by initialization defaults and updateable through `setAvailableLocales`; it must not be serialized. `packages/admin/tests/shell-preferences.test.ts` verifies persistence merge behavior.

Runtime-only presentation state, never persisted:

- `naiveUiConfig` computed — `{ theme, themeOverrides, locale, componentOptions }` props for the host `n-config-provider`, derived from `themeMode` (incl. system dark via the `systemUsesDark` signal), `fontSize` (px overrides + naive-ui per-component size tier), and `locale` (naive-ui locale via `resolveAdminNaiveUiLocale`, falling back through the host-owned `fallbackLocale` supplied to `initialize`). The font-size preference maps to `componentOptions` (`COMPONENT_SIZE_OPTIONS`) because naive-ui has no single global size prop. Hosts bind it directly: `<n-config-provider v-bind="preferences.naiveUiConfig">`. Mapping functions live in `src/runtime/naive-ui-config.ts`; the store imports them rather than owning naive-ui knowledge.
- `proLayoutConfig` computed — `{ tabbarHeight, collapsed }` props for `ProLayout` (pro-naive-ui), derived from `fontSize` (browser-measured tabbar heights per tier, `PRO_LAYOUT_TABBAR_HEIGHTS` in `src/runtime/pro-layout-config.ts`) and `sidebarCollapsed`. AdminShell binds it: `<ProLayout {...preferences.proLayoutConfig} …>`. Mapping functions live in `src/runtime/pro-layout-config.ts`; never hardcode ProLayout height props in the component.
- `setSystemUsesDark(value)` action — the browser color-scheme signal the host feeds from its `matchMedia` listener; used only by the system-mode theme derivation.
- `fallbackLocale` — host-owned naive-ui fallback authority passed to `initialize({ fallbackLocale })`, default `en`.

Boundary tests must cover the naive-ui config derivation: theme per mode incl. system + `setSystemUsesDark`, size mapping, locale mapping with unsupported-locale fallback, and non-persistence of these runtime-only fields.

`cloneShellPreferences` and the computed `preferences` snapshot clone locale options. The store also exposes the raw `availableLocales` ref, so consumers must not mutate that array directly; use `setAvailableLocales` to retain locale realignment and persistence behavior.

## Shell chrome follows the size tier

`AdminShell`'s header nav buttons and tab strip must not hardcode a `size` prop; they resolve their size from the host's `componentOptions` tier (naive-ui merges `props.size ?? componentOptions.Button.size ?? 'medium'`). Removing the hardcoded sizes lets the font-size preference resize the top bar. `Menu` is not a key in naive-ui's `GlobalComponentConfig`, so the sidebar menu cannot be resized per-component; its text still follows `themeOverrides.common.fontSize`.

## ProLayout chrome is plain HTML with fixed-height props

pro-naive-ui's `ProLayout` renders plain HTML (`aside`/`header`/`main`/`footer`) plus `NScrollbar`; it has **no `size` prop** and creates no nested config provider — `componentOptions` from the host `NConfigProvider` reaches naive-ui components in its slots (e.g. `NTabs`) but can never resize ProLayout's own chrome. `ProConfigProvider` (pro-naive-ui's `n-config-provider` wrapper) forwards every `NConfigProvider` prop incl. `componentOptions` via `useOmitProps`; it is not required for size and adds only `propOverrides`/`empty`.

Chrome heights are explicit props (`tabbarHeight` default 38, `navHeight` 50, `footerHeight` 32) emitted as CSS vars (`--pro-layout-tabbar-height`). In vertical layout the header is `position: absolute` and content reserves space via `--pro-layout-content-margin-top: nav.height + tabbar.height`, so the prop value must equal the rendered height — content-driven CSS (`height: auto`/`fit-content`) would grow the container without growing the margin and slide content under the header.

Tabbar heights per font-size tier are browser-measured constants in `PRO_LAYOUT_TABBAR_HEIGHTS` (small 41 / medium 45 / large 52; naive-ui 2.44.1, pro-naive-ui 3.2.3). The card-type tab nav is intrinsic-height (NTab 35.1/38.7/45.0 + ~5px naive-ui top padding + 1px border + headroom) and does not stretch with the container. naive-ui size tiers are discrete, so tab height is not proportional to the 13/14/16px theme fonts — do not derive the heights with a formula. Re-measure when naive-ui bumps: switch each font-size tier in the demo, read `[data-admin-tab-key]` height and `.pro-layout__tabbar` `scrollHeight`/`clientHeight`, and keep container ≥ content + 1px border.

## Sidebar menu uses useLayoutMenu

`AdminShell` drives the sidebar `NMenu` from pro-naive-ui's `useLayoutMenu` (exported from the pro-naive-ui package root):

- `useLayoutMenu({ menus: () => menu.options, mode: () => "vertical" })` — mode is the future layout-mode preference binding point.
- Spread `layout.value.verticalMenuProps` on the slot `NMenu` (mode, options, value, expandedKeys, onUpdateValue, onUpdateExpandedKeys). Do NOT override its `onUpdateValue` — its internal handler updates `activeKey` and the expanded-keys watcher follows.
- Navigation is decoupled through `activeKey`: a watcher syncs `nav.navigation?.active?.nav.navKey` into `activeKey` (immediate), and a second watcher navigates on `activeKey` change, skipping null and keys already active (echo guard). This single seam serves every menu instance, so a future horizontal mode renders `horizontalMenuProps` in a nav slot with no extra navigation wiring.
- NMenu's default `responsive` auto-collapse keeps the sidebar collapse behavior working without a `collapsed` prop.

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
