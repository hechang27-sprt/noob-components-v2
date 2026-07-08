# Agent research notes: noob-components rewrite

Source inspected: `../noob-components`
Target workspace for notes: `docs/agent`

## Deliverables

- `architecture-audit.md` — evidence-backed audit of the current library.
- `components-rewrite-brainstorm.md` — component-library rewrite options and constraints.
- `admin-rewrite-brainstorm.md` — admin-shell rewrite options and constraints.
- `rewrite-plan.md` — phased rewrite plan and migration concerns.
- `boundary-map.md` — old export-by-export mapping to Naive direct usage, `@noob-naive-ui/ui`, `@noob-naive-ui/admin`, or deletion.
- `admin-runtime-contract.md` — frontend-only runtime contract for `@noob-naive-ui/admin`, including starter/app responsibilities and forbidden backend coupling.

## Scope

This pass is research-only. It documents the current architecture and the rewrite constraints implied by the existing code and your requested goals:

1. Modern Vue 3 + TypeScript library structure, Vite 8, Tailwind CSS 4, Pinia.
2. Split the current combined package into separate workspace packages.
3. Improve component API ergonomics, including auto-import and virtualized component simplification.
4. Rework admin theming, query/transport, and backend coupling.

## Key findings

- The current package is a single published surface that exports UI components, admin views, store, HTTP wrappers, API wrappers, config, i18n, utilities, websocket, and tools from one root package (`../noob-components/package.json:20-81`, `../noob-components/index.ts:1-2`, `../noob-components/plugs/index.ts:1-11`, `../noob-components/packages/index.ts:1-3`).
- `packages/base` and `packages/manage` are already distinct folders, but they are not isolated packages; both are part of the same build and public API surface (`../noob-components/package.json:25-80`).
- The component layer is strongly Element Plus–coupled today. That includes low-level wrappers, table/form/pagination composition, `el-*` usage in SFC templates, and even `DropdownInstance` types inside `json-view` (`../noob-components/packages/base/index.ts:1-48`, grep evidence in `../noob-components/packages/base`, `../noob-components/packages/base/data/json-view/json-view.vue:117-128`).
- `list-table-v2` already contains meaningful virtualization and measurement work: a custom virtualizer (`useVirtualRows`) plus pretext-based width/height estimation hooks and runtime height augmentation (`../noob-components/packages/base/data/list-table-v2/useVirtualRows.ts:44-155`, `usePretextColumnWidths.ts:184-273`, `usePretextRowHeights.ts:18-127`, `useRuntimeHeightAugment.ts:26-155`).
- Admin theming is not centralized. Theme and size tokens live in Vuex state and are pulled directly into many SFC styles through `v-bind(...)` and scattered `--el-*` overrides (`../noob-components/plugs/store/index.ts:17-18`, `../noob-components/plugs/config/styles/*.ts`, `../noob-components/packages/manage/router/index.vue:176-266`, `../noob-components/packages/manage/head/head.vue:60-120`, `../noob-components/packages/manage/head/menu-tree.vue:92-157`).
- State management and server-state/transport concerns are blurred. `packages/manage/router/index.vue` uses Vuex store state, calls `Api.pub.getInfo()` directly, polls every 5 seconds, and owns app-shell side effects like `window.onresize` (`../noob-components/packages/manage/router/index.vue:34-161`). Separately, `plugs/http` exposes three parallel axios wrappers with global loading/message side effects and response-shape filtering (`../noob-components/plugs/http/index.ts:1-4`, `axios.ts:73-191`, `axios2.ts:66-149`, `axios3.ts:79-226`).

## Constraints for the rewrite

- The split into two workspace packages is not just a folder move. The current public package exports namespaces like `Api`, `Http`, `Store`, `Lang`, `Views`, `Common`, `Element`, and `Index`; any rewrite needs an explicit export-boundary redesign and migration story (`../noob-components/examples/App.vue:16-27`, `../noob-components/examples/config/router.ts:1-73`).
- The admin rewrite should treat three concerns separately:
  - shell/runtime state migration in `@noob-naive-ui/admin`: Vuex → Pinia
  - backend-owned query/server-state layers: move to starters/app code instead of the shared admin package
  - backend transport/API clients and backend-derived auth/permission/session interpretation: keep them out of `@noob-naive-ui/admin`; the shared runtime should only consume frontend-ready auth status, navigation/menu data, and route-visibility inputs
- The component rewrite should treat two concerns separately:
  - internal logic seams that survive UI-foundation changes
  - the concrete Naive UI migration surface: provider-owned theming, component coverage replacement, and resolver/import setup

- Naive UI should be treated as a peer, directly co-consumed foundation for internal teams. `@noob-naive-ui/ui` should export only value-add composites, hooks, token/theme bridge helpers, and specialized data widgets — not Naive UI re-exports or wrapper parity.
