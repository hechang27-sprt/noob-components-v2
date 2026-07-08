# Architecture audit: current `noob-components`

Source inspected: `../noob-components`

## 1. Package shape today

### Single published surface

The current library publishes one root package with many subpath exports:

- root `.`
- `./components`
- `./tools`
- `./manage`
- `./composables`
- `./api`
- `./http`
- `./ws`
- `./i18n`
- `./config`
- `./element`
- `./store`
- `./utils`
- `./plugs`
- `./packages`

Evidence: `../noob-components/package.json:20-81`.

Root re-exports make the entire surface available from one import path:

- `index.ts` re-exports `./packages` and `./plugs` (`../noob-components/index.ts:1-2`).
- `packages/index.ts` re-exports `base`, `tool`, and `manage` (`../noob-components/packages/index.ts:1-3`).
- `plugs/index.ts` re-exports config, element helpers, store, HTTP, i18n, API, websocket, constants, utilities, and composables (`../noob-components/plugs/index.ts:1-11`).

### Already split in folders, not in package boundaries

The user-visible split between components and admin already exists in source layout:

- `packages/base` — component layer.
- `packages/manage` — admin shell and admin views.

But both are still built and shipped from one package manifest and one Vite build (`../noob-components/package.json:83-90`).

## 2. Toolchain state

### Mixed toolchain, not a clean legacy stack

The package is already partially on modern Vue/Vite tooling:

- `vue` `^3.5.26`
- `@vitejs/plugin-vue` `^6.0.3`
- `@vitejs/plugin-vue-jsx` `^5.1.5`
- `vite` `^7.3.0`
- `vue-tsc` `^3.2.6`

But it also still carries Vue CLI-era dependencies and Vuex:

- `@vue/cli-plugin-babel`
- `@vue/cli-plugin-router`
- `@vue/cli-plugin-typescript`
- `@vue/cli-plugin-vuex`
- `@vue/cli-service`
- runtime `vuex` `^4.1.0`

Evidence: `../noob-components/package.json:92-136`.

The repo also maintains both build paths at once:

- `vite.config.ts` drives app and lib builds, and the lib build manually enumerates every entrypoint/subpath export (`../noob-components/vite.config.ts:10-95`).
- examples alias `noob-mengyxu` back to source in Vite (`../noob-components/vite.config.ts:89-94`).
- `vue.config.js` still configures a Vue CLI dev server, pages entry, webpack alias, and Babel transpilation for `packages` and `plugs` (`../noob-components/vue.config.js:6-42`).
- `babel.config.js` still depends on the Vue CLI Babel preset (`../noob-components/babel.config.js:1-5`).

Decision implication: the rewrite should target toolchain simplification and packaging simplification, not just Vite 7 → 8.

## 3. Public API surface and migration risk

### Consumers import more than UI components

Examples consume the library as an app framework, not just as a component library:

- `examples/App.vue` imports `Index`, `Element`, `Views` from `noob-mengyxu` and `useStore` from Vuex (`../noob-components/examples/App.vue:16-27`).
- `examples/config/router.ts` imports `Views` and `Common`, mounts `Views.routes`, and uses `Common.Login2` as a route component (`../noob-components/examples/config/router.ts:1-73`).

`packages/manage/index.ts` exports:

- `Index`
- `ZhuBeiDong`
- `Common`
- `NoobHead`
- `Views`

Evidence: `../noob-components/packages/manage/index.ts:1-6`.

`packages/manage/views/index.ts` exports both route records and menu metadata from one module (`../noob-components/packages/manage/views/index.ts:1-69`).

### Rewrite consequence

A split into workspace packages is an export-boundary redesign problem:

- not just `packages/base` vs `packages/manage`
- also `plugs/*`, `Views`, `Common`, and root namespace contracts

## 4. Component-layer audit (`packages/base`)

### Current export shape

`packages/base/index.ts` exports wrappers and data components from one flat module:

- input-ish wrappers: `NoobButton`, `NoobSelect`, `NoobInput`, `NoobDate`, `TzDatePicker`, `TzDateTime`
- utility UI: `NoobTag`, `LightBox`, `ButtonWithTooltip`, `ConfirmCancel`, `WsMonitorToggle`
- data views: `SearchRow`, `ListTable`, `ListTableV2`, `NoData`, `JsonView`, `ListTableDialog`, `Infomation`, `ModifyForm`, `Descriptions`, `TableAction`

Evidence: `../noob-components/packages/base/index.ts:1-48`.

### Strong Element Plus coupling

The current component layer is not headless. It is built around Element Plus assumptions.

Evidence:

- `list-table.vue` wraps `el-table`, `el-table-column`, and `el-pagination`, then themes them through `--el-table-*` vars (`../noob-components/packages/base/data/list-table.vue`, grep evidence).
- `modify-form.vue` wraps `el-form`, `el-form-item`, `el-input`, `el-date-editor`, and imports `FormInstance` from Element Plus (`../noob-components/packages/base/data/modify-form.vue`, grep evidence).
- `json-view.vue` uses `el-dropdown`, `el-dropdown-menu`, `el-dropdown-item`, and imports `DropdownInstance` from Element Plus (`../noob-components/packages/base/data/json-view/json-view.vue:85-112`, `:117-128`).
- `button.vue`, `buttonWithTooltip.vue`, `confirmCancel.vue`, and others are direct EP wrappers (`grep` results under `../noob-components/packages/base`).

This matters for the rewrite: swapping UI foundations later will be expensive if package boundaries continue to expose Element Plus semantics as the default API.

### `list-table-v2`: custom virtualized table already exists

This module is not a blank slate. It already has a useful architecture split worth preserving.

#### What exists

- Generic TS props and renderer contracts:
  - `ListTableColumn<T>` supports `cellRenderer`, `headerCellRenderer`, `dict`, `timestamp`, sizing/flex hints (`../noob-components/packages/base/data/list-table-v2/types.ts:11-74`).
  - `ListTableProps<T>` supports paged/unpaged data and table options (`../noob-components/packages/base/data/list-table-v2/types.ts:87-153`).
  - custom renderer return type can include `minHeight` / `minWidth` hints (`../noob-components/packages/base/data/list-table-v2/types.ts:181-216`).
- Pretext-based column width estimation (`usePretextColumnWidths`) samples data, measures header/cell text, derives flex basis/grow/shrink, and computes actual widths (`../noob-components/packages/base/data/list-table-v2/usePretextColumnWidths.ts:184-273`).
- Pretext-based row height estimation (`resolveRowHeights`) measures wrapped cell text and falls back for custom renderers (`../noob-components/packages/base/data/list-table-v2/usePretextRowHeights.ts:18-127`).
- Runtime height augmentation records actual DOM heights for custom renderers and recomputes column averages (`../noob-components/packages/base/data/list-table-v2/useRuntimeHeightAugment.ts:26-155`).
- A custom virtualizer uses prefix sums and binary search over row heights (`../noob-components/packages/base/data/list-table-v2/useVirtualRows.ts:44-155`).

#### Why this is useful

There is already a clean seam between:

- measurement pipeline
- virtual scrolling math
- rendering contract

That means the rewrite can likely preserve the measurement pipeline while replacing the handwritten virtualizer.

#### Pain points

- `list-table-v2.vue` is a very large component that mixes rendering, formatting, layout measurement, runtime observation, pagination, and state/store access (`../noob-components/packages/base/data/list-table-v2/list-table-v2.vue:91-363` plus remaining file body).
- It still depends on Vuex and project-specific formatting/util imports, including `useStore` from `vuex`, `formatTimestampFromValue` from `plugs/composables`, and `JsonView` from the package root; that root import also tightens internal coupling (`../noob-components/packages/base/data/list-table-v2/list-table-v2.vue:104-122`).
- Custom cell measurement relies on direct DOM tracking and `ResizeObserver`, increasing implementation complexity.

### `json-view`: rich data viewer, still tied to current stack

#### What exists

- Flattening logic is extracted into `buildVisibleJsonRows`, with support for objects, arrays, maps, sets, collapse state, and line numbering (`../noob-components/packages/base/data/json-view/flattenJson.ts:1-542`).
- Rendering supports custom key/value/action slots, dynamic row heights, and optional virtualization (`../noob-components/packages/base/data/json-view/json-view.vue:148-363`).
- Virtualization reuses `useVirtualRows` from `list-table-v2` (`../noob-components/packages/base/data/json-view/json-view.vue:119-120`, `:335-337`).

#### Pain points

- The component is large and multi-role: tree flattening consumer, line-wrap measurer, virtualizer consumer, context-menu host, and Element Plus dropdown host (`../noob-components/packages/base/data/json-view/json-view.vue:116-363`).
- It is not headless; menu behavior and types are bound to Element Plus (`../noob-components/packages/base/data/json-view/json-view.vue:85-112`, `:117-128`).
- Measurement and virtualization code are shared indirectly with `list-table-v2`, but without a separate internal package seam.

## 5. Admin-shell audit (`packages/manage` + `plugs/*`)

### Router shell is doing state, polling, and layout side effects

`packages/manage/router/index.vue`:

- uses `useStore()` from Vuex (`:34-45`)
- imports `Api` from the root package (`:37`)
- polls `Api.pub.getInfo()` every 5 seconds (`:108-123`, `:139-155`)
- writes `window.onresize` directly and commits layout sizes into store (`:103-106`, `:139-145`)
- pushes `/login` based on response shape (`:112-121`, `:124-137`)

Evidence: `../noob-components/packages/manage/router/index.vue:34-161`.

This is imperative app-shell behavior, not just view rendering.

### Theming is scattered and store-driven

Theme tokens are class instances stored in Vuex state:

- `state.style = Styles.plain`
- `state.size = Size.normal`

Evidence: `../noob-components/plugs/store/index.ts:17-18`.

Theme objects contain color tokens such as `bodyBg`, `headBg`, `menuBg`, `tableBg`, `selectionBg`, etc. (`../noob-components/plugs/config/styles/plain.ts:3-36`, `dark.ts:4-31`).

Size objects contain layout tokens such as `headHeight`, `asideWidth`, `fontSize`, `headIconSize`, `tablePad`, etc. (`../noob-components/plugs/config/size/normal.ts:1-30`).

Those tokens are consumed directly inside SFC styles via `v-bind(...)`:

- app shell and global Element Plus overrides in `router/index.vue` (`../noob-components/packages/manage/router/index.vue:176-266`)
- header sizing/colors in `head.vue` (`../noob-components/packages/manage/head/head.vue:60-120`)
- menu colors and active state in `menu-tree.vue` (`../noob-components/packages/manage/head/menu-tree.vue:92-157`)
- style picker mutates `state.style` by committing one of several theme objects (`../noob-components/packages/manage/head/style-change.vue:56-69`)

This is why the theme is semi-broken: tokens exist, but there is no centralized app-shell token emission layer. Styling leaks through many component-local overrides and `--el-*` patches.

### Views package blends app capabilities and content

`packages/manage/views/index.ts` exports both:

- route components
- menu descriptor objects

from one module (`../noob-components/packages/manage/views/index.ts:1-69`).

This makes admin extensibility route-structure-driven rather than capability-driven.

## 6. Data layer and transport audit

### Three axios wrappers, parallel semantics

`plugs/http/index.ts` exports:

- `Axios`
- `Axios2`
- `Axios3`

Evidence: `../noob-components/plugs/http/index.ts:1-4`.

These wrappers differ in behavior:

- `axios.ts` applies loading/message side effects and normalizes `{ success, message, data }` into booleans/data (`../noob-components/plugs/http/axios.ts:73-191`).
- `axios2.ts` still applies loading/message side effects but returns raw response payload more directly (`../noob-components/plugs/http/axios2.ts:66-149`).
- `axios3.ts` introduces an options object with `filter`, `query`, `noMsg`, `noLoading`, plus another response-shape filter path (`../noob-components/plugs/http/axios3.ts:79-226`).

Common traits across wrappers:

- mutate query/body to delete “empty” values
- append timestamp `t`
- couple transport to global loading UI and toast messages
- encode session-timeout behavior into HTTP response handling

### API wrappers are transport-shaped, not domain-shaped

Examples:

- `plugs/api/public.ts` calls `get/post/put/delate` from `../http/axios` and wraps them again in ad-hoc `new Promise(...)` shells; `getByCodes` and `getInfo` both resolve `false` when the wrapped call returns a falsy result or rejects (`../noob-components/plugs/api/public.ts:11-42`).
- `plugs/api/base.ts` defines shared CRUD helpers like `queryPage`, `queryList`, `save`, `update`, and `deleteById`; these helpers resolve default fallback values such as `pageResult`, `[]`, `{}`, or `false` instead of preserving transport/domain errors (`../noob-components/plugs/api/base.ts:5-100`).

Result: backend response conventions, UI loading/toast behavior, and client data access are tightly coupled.

## 7. Current state management shape

The store holds heterogeneous concerns in one Vuex state object:

- dictionaries
- role maps
- menus
- theme/style
- size/layout
- actions
- user
- refresh flags

Evidence: `../noob-components/plugs/store/index.ts:7-23`.

Actions fetch dictionaries, menus, permissions, and login-related state directly from API wrappers (`../noob-components/plugs/store/index.ts:25-80`).

Rewrite implication: Pinia migration should split at least:

- auth/session
- layout/theme
- dictionaries/reference data
- permissions/actions

## 8. Rewrite constraints derived from the audit

### Package boundaries

A two-package workspace should explicitly choose what moves where:

- component package: reusable UI + composables + optional adapters
- admin package: app shell + auth/layout stores + admin route/view kit

But current `plugs/*` exports cut across both. A third internal/shared package may be warranted. [INFERENCE]

### Components

The rewrite should not throw away:

- the typed column API from `list-table-v2`
- pretext-backed text measurement work
- the row/column sizing seam
- the JSON flattening logic

The likely simplification target is the virtual-scroll math and internal coupling, not the measurement idea itself. [INFERENCE]

### Admin

The rewrite should separate:

1. Pinia client state
2. TanStack Query-style server state
3. transport adapters
4. theme token emission at app-shell level

If these remain blurred, the same inflexibility will survive the rewrite.
