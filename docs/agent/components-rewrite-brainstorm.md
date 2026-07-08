# Components rewrite brainstorm

Source inspected: `../noob-components/packages/base`

## What is worth preserving

### 1. Typed column/rendering contract in `list-table-v2`

Keep the idea behind:

- `ListTableColumn<T>` with typed keys, formatter-ish flags, and renderer hooks (`../noob-components/packages/base/data/list-table-v2/types.ts:11-74`)
- paged vs unpaged data contract (`../noob-components/packages/base/data/list-table-v2/types.ts:87-164`)
- `cellRenderer` returning either a plain VNode or a size-hinted object (`../noob-components/packages/base/data/list-table-v2/types.ts:181-216`)

This is one of the deeper seams in the current code. Callers describe columns and data; the table implementation owns layout, rendering, and virtualization.

### 2. Measurement pipeline

Keep the measurement seam, even if the renderer changes:

- column widths from sampled content + header measurement via pretext (`../noob-components/packages/base/data/list-table-v2/usePretextColumnWidths.ts:184-273`)
- row heights from measured wrapped text via pretext (`../noob-components/packages/base/data/list-table-v2/usePretextRowHeights.ts:18-127`)
- runtime height augmentation for custom-rendered cells (`../noob-components/packages/base/data/list-table-v2/useRuntimeHeightAugment.ts:26-155`)

This work already captures the hard part: estimating content-driven layout without rendering every row.

### 3. JSON flattening logic

`json-view` already has a valuable non-UI core:

- flatten/tree-walk logic in `flattenJson.ts`
- support for object/array/map/set
- collapse state and line-number semantics

Evidence: `../noob-components/packages/base/data/json-view/flattenJson.ts:1-542`.

That logic should survive any component rewrite.

## What is worth replacing

### 1. Handwritten virtual-scroll math

Current state:

- prefix-sum offsets
- binary search for first visible row
- overscan logic
- visible-row materialization

Evidence: `../noob-components/packages/base/data/list-table-v2/useVirtualRows.ts:44-155`.

Rewrite direction:

- replace custom virtualizer with `@tanstack/virtual-core` / TanStack Virtual adapters [INFERENCE]
- keep the row-height and column-width measurement pipeline if it continues to outperform naive DOM measurement [INFERENCE]

Why:

- virtualization math is infrastructure, not product differentiation
- current implementation is compact but still custom-maintenance code
- `json-view` already reuses this hook, so a better virtualizer would simplify two complex components at once (`../noob-components/packages/base/data/json-view/json-view.vue:119-120`, `:335-337`)

### 2. Replace Element Plus with Naive UI as the visual foundation

Current coupling is broad:

- forms, buttons, table, pagination, tooltips, dropdowns, descriptions, date pickers, containers, etc. appear directly across `packages/base`
- `json-view` imports `DropdownInstance` from Element Plus (`../noob-components/packages/base/data/json-view/json-view.vue:117-118`)
- wrappers like `button.vue` and `modify-form.vue` expose EP assumptions instead of neutral primitives (grep evidence under `../noob-components/packages/base`)

Chosen rewrite direction:

- keep the internal logic seams headless where they already pay off
- replace Element Plus with Naive UI as the concrete component foundation
- do not preserve EP-specific prop names, slot conventions, or CSS-variable patch surfaces as the new public API

Why this is a coherent clean break:

- the current theming model is suffering from scattered `--el-*` overrides and store-bound style injection
- the admin-first product direction benefits more from a centrally owned provider/theme system than from EP compatibility
- the hardest custom work in this repo is data-heavy behavior (`list-table-v2`, `json-view`), not commodity button/input rendering

## Naive UI migration implications

### 1. Provider-owned theming replaces scattered SFC overrides

The rewrite should move theme ownership to the app root through Naive UI's config-provider/theme-overrides model, with your semantic design tokens feeding that provider. This is a better fit than the current pattern of local `v-bind(...)` styles and `--el-*` patching. [INFERENCE grounded by Naive UI docs research]

Implication:

- `@noob-naive-ui/admin` owns theme mode, font size, and semantic tokens
- `@noob-naive-ui/ui` consumes semantic tokens and Naive-compatible theme contracts
- third-party bridge styling should be isolated to dedicated theme bridge files, not scattered through feature SFCs

### 2. Component coverage gaps must be treated as first-class migration work

Naive UI gives you a strong base set of controls, but the important migration surface is not primitive controls alone. The current library relies on higher-level admin composites and EP-specific patterns such as:

- action-heavy tables (`packages/base/data/list-table.vue`, `list-table-v2.vue`)
- modal CRUD forms (`packages/manage/views/user.vue`, `role.vue`)
- confirmation and validation helper conventions (`packages/manage/views/user.vue:45-74`, `role.vue:45-73`)
- dropdown/menu integration inside `json-view` (`../noob-components/packages/base/data/json-view/json-view.vue:85-112`, `:117-128`)

So migration planning should explicitly audit:

- what maps directly to Naive components
- what should become your own admin composites on top of Naive
- what old wrappers should be deleted instead of ported

### 3. Import/resolver setup should target direct Naive usage + your package together

The new auto-import story should cover two layers:

- direct Naive UI usage conventions in app/admin code [INFERENCE]
- custom resolver/import setup for `@noob-naive-ui/ui` value-add components and composables

The point is not only convenience. It is to stop recreating the old giant root namespace import pattern while keeping admin-page authoring fast and making the boundary obvious: use Naive UI directly for commodity controls, and use `@noob-naive-ui/ui` for composites, hooks, token/theme helpers, and specialized widgets.

## Foundation decision

The user has now chosen Naive UI as a rewrite constraint. The remaining decision is not EP vs Naive. It is how thin or thick your own layer above Naive should be.

Recommendation:

- keep primitive wrappers thin or avoid them where they add no durable value
- do not pursue Naive UI wrapper parity or Naive re-exports from `@noob-naive-ui/ui`
- put your product value into admin composites, data-heavy components, token plumbing, and workflow conventions
- preserve the option for internal headless seams in measurement/virtualization logic without trying to make the whole UI stack headless-first

## Candidate package shape

## Option A — single published component package, internal layers only

- `@noob-naive-ui/ui` _(preferred name; supports the admin-first platform while standardizing on Naive UI as a directly co-consumed foundation)_
  - `core/` — headless logic, measurement, flattening, virtualization integration
  - `foundations/naive/` — Naive UI provider bridge, theme contracts, resolver integration
  - `components/` — exported value-add composites and specialized widgets only
  - `composables/` — exported value-add hooks only
  - `styles/`

Pros:

- simpler external story
- fewer packages to manage
- keeps Naive UI migration and internal logic extraction coordinated in one package

Cons:

- weaker enforcement of boundaries between foundation glue and product components
- requires discipline so Naive-specific assumptions do not leak into every public contract

## Option B — separate core + Naive foundation packages

- `@noob-naive-ui/ui-core`
- `@noob-naive-ui/ui-naive`

Pros:

- strongest seam between headless internals and Naive-backed rendering/theming
- easier to test internal logic without provider/rendering concerns
- clearer path if some internals later need to outlive the Naive-specific layer

Cons:

- heavier package surface
- may be more than needed if Naive UI is the settled long-term foundation rather than a replaceable adapter

Recommendation: start with Option A internally, but keep the code organized so that Naive foundation glue can be split into its own package later if it starts dominating `@noob-naive-ui/ui`. [INFERENCE]

## Auto-import strategy

User goal: incorporate `unimport` for auto-import.

Practical split:

- components: use `unplugin-vue-components` with a custom resolver for `@noob-naive-ui/ui` components, while documenting direct Naive UI imports/usage separately [INFERENCE from web research + common Vue ecosystem pattern]
- composables/utilities: use `unimport` / `unplugin-auto-import` for `@noob-naive-ui/ui` composables and helper functions [INFERENCE]

Reason:

- component registration and function auto-import solve different DX problems
- the current flat export surface is broad; resolver-based imports can reduce friction without reintroducing a giant namespace import
- keeping Naive UI direct-consumption separate avoids creating a fake-complete wrapper surface

Grounding:

- `unplugin-vue-components` is the established Vue auto-import path for components, per project docs surfaced in research.

## Suggested internal seams

### Table system

- `table-schema` — typed column definitions and render contracts
- `table-measurement` — pretext-backed width/height estimation
- `table-virtualization` — TanStack Virtual adapter
- `table-renderer` — Vue renderer and slots
- `table-theme` — semantic classes/tokens only

### JSON viewer system

- `json-flatten` — tree → visible rows
- `json-measurement` — wrapped-line sizing
- `json-virtualization` — shared virtual adapter
- `json-menu` — optional adapter seam, not hardwired to EP dropdown

These are deep-module seams: callers should consume one component or one composable, not five cooperating internals.

## Risks to account for

- Replacing virtualization math must not regress dynamic-height rows from custom renderers; the runtime height augmentation logic exists for a reason (`../noob-components/packages/base/data/list-table-v2/useRuntimeHeightAugment.ts:26-155`).
- A headless/core split can become over-abstracted if only one adapter exists; keep the external API small and avoid adapter leakage. [INFERENCE]
- Auto-import can hide import cost and naming collisions if the exported naming scheme remains flat; package naming discipline matters. [INFERENCE]

## Concrete recommendations

1. Preserve `list-table-v2`'s typed schema and measurement ideas.
2. Replace `useVirtualRows` with a TanStack Virtual-based seam.
3. Extract `flattenJson.ts` and shared virtualization/measurement helpers into internal non-SFC modules first.
4. Stop exposing Element Plus assumptions as the only public API path.
5. Use resolver-based component auto-import and separate composable auto-import.
