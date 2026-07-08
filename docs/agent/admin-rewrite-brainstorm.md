# Admin rewrite brainstorm

Source inspected: `../noob-components/packages/manage`, `../noob-components/plugs/*`

## Current problem decomposition

The admin side has at least three distinct problems that should not be solved as one refactor bucket.

### 1. Client state management problem

Current state:

- Vuex store holds user, menus, theme, size, dictionaries, actions, and refresh flags in one shared store (`../noob-components/plugs/store/index.ts:7-23`).
- app shell and components call `useStore()` directly (`../noob-components/packages/manage/router/index.vue:34-45`, `../noob-components/packages/manage/head/head.vue:20-25`, `../noob-components/packages/manage/head/menu-tree.vue:50-57`).

Rewrite target:

- Pinia stores split by concern:
  - auth/session
  - layout/theme
  - dictionaries/reference data
  - permissions/actions

### 2. Server-state ownership problem

Current state:

- app shell directly calls `Api.pub.getInfo()` (`../noob-components/packages/manage/router/index.vue:108-123`).
- auth refresh is implemented by shell polling every 5 seconds (`../noob-components/packages/manage/router/index.vue:139-155`).
- many store actions and views fetch directly from API wrappers (`../noob-components/plugs/store/index.ts:25-80`, manage view files referenced in `packages/manage/views/index.ts:1-69`).

Rewrite target:

- TanStack Query for remote state ownership [INFERENCE informed by TanStack Query docs research]
- query keys and query options centralized in a query layer, not embedded in views
- polling/refetch strategy owned by query config instead of ad-hoc timers where possible [INFERENCE]

Grounding from research:

- TanStack Query Vue docs recommend central reusable query options for `queryKey` + `queryFn`, which fits the need to separate transport and components.

### 3. Transport/API-shape problem

Current state:

- three axios wrappers with different semantics: `Axios`, `Axios2`, `Axios3` (`../noob-components/plugs/http/index.ts:1-4`).
- wrappers own loading/message side effects, response filtering, and session-timeout routing behavior (`../noob-components/plugs/http/axios.ts:73-191`, `../noob-components/plugs/http/axios2.ts:66-149`, `../noob-components/plugs/http/axios3.ts:79-226`).
- API wrappers often normalize failures into fallback values instead of leaving failure as a first-class result (`../noob-components/plugs/api/public.ts:11-42`, `../noob-components/plugs/api/base.ts:5-100`).

Rewrite target:

- a thin transport client
- endpoint/domain modules above transport
- query layer above domain modules
- UI-level toasts/loading handled outside the transport core

This is the main decoupling needed so the Java/Spring backend can evolve separately from the admin UI.

## Theming rewrite direction

### Evidence of current breakage pattern

Theme tokens exist today as JS classes:

- `plain`, `plainb`, `light`, `dark`, `zhuBeiDong` in `plugs/config/styles/index.ts:1-10`
- examples include tokens like `bodyBg`, `headBg`, `menuBg`, `tableBg`, `itemBg`, `selectionBg` (`../noob-components/plugs/config/styles/plain.ts:3-36`, `dark.ts:4-31`)

But token application is scattered:

- shell colors/backgrounds in `packages/manage/router/index.vue:176-266`
- head sizing/colors in `packages/manage/head/head.vue:60-120`
- menu colors/active state in `packages/manage/head/menu-tree.vue:92-157`
- style selection is hardcoded in `packages/manage/head/style-change.vue:22-49`, `:65-67`

This is not a centralized theme system. It is store-driven token objects plus distributed SFC overrides.

### Rewrite direction

- emit semantic design tokens once at the app-shell/root level as CSS variables
- map Tailwind utilities and custom CSS to those tokens
- keep component styles semantic (`bg-surface`, `text-muted`, etc. at the design-system level [INFERENCE])
- isolate third-party component overrides to adapter/theme bridge files instead of scattering `--el-*` patches across views [INFERENCE]

Grounding from research:

- Tailwind CSS 4 `@theme` supports theme variables mapped to utilities and CSS vars.
- shadcn/vue-style theming uses semantic CSS vars at `:root` / dark-mode scope, then maps them into Tailwind utilities.

### Suggested token split

- app shell: background, foreground, border, ring, shadow, header, sidebar
- data display: table bg/head/hover/selection/muted
- controls: input surface, button surface, accent, danger, success
- font size presets: small, medium, large

## App-shell simplification

Current shell responsibilities are too broad:

- auth fetch/poll
- resize handling
- route shell layout
- theme application
- logout/password flows

Evidence: `../noob-components/packages/manage/router/index.vue:34-161`.

Rewrite direction:

- `useAuthStore` / auth query owns session state
- `useLayoutStore` owns sidebar/header/open state and viewport-derived layout state [INFERENCE]
- route shell only renders shell and wires composables
- component-local observers stay local (`ResizeObserver` in table/json viewer), while global window listeners move into dedicated composables

## Package-shape options

## Recommended direction — backend-decoupled admin runtime

- `@noob-naive-ui/ui`
- `@noob-naive-ui/admin`
- optional backend-specific starters/templates consuming both

In this direction, `@noob-naive-ui/admin` is **not** a concrete admin-operations package. It should not ship built-in role/permission/dictionary management pages like the old library. Instead, it should stay as backend-decoupled as possible and provide a reusable frontend shell/runtime that different starters can wire to different backends.

### `@noob-naive-ui/admin` should own

- page shell
- menu/navigation chrome
- theme control and language control
- cosmetic/style control entry points
- basic login page and auth-flow UI
- consumption of frontend-ready auth status
- consumption of frontend-ready menu/navigation data
- route/menu visibility application from frontend-ready inputs
- app-shell state and conventions that are stable across backends

### `@noob-naive-ui/admin` should not own

- concrete role-management pages
- concrete permission-management pages
- concrete dictionary/config CRUD pages
- backend-shaped API wrappers
- session DTOs or backend user/session models
- backend permission payloads or backend route/menu DTOs
- assumptions about one RBAC schema or one backend contract

### Delivery model implication

This strengthens the hybrid delivery model:

- versioned `@noob-naive-ui/admin` runtime/package
- official starters/templates for concrete backend integrations

That lets you keep centralized upgrades for shell/auth/theme/navigation behavior without forcing backend-specific admin operations into the shared package.

### Pros

- cleaner backend decoupling than the old `packages/manage`
- easier to support multiple backend integrations later
- clearer platform boundary: runtime in package, business/admin operations in starters or separate feature packages

### Cons

- less impressive out-of-the-box feature surface than the old bundled manage pages
- requires a sharper frontend runtime contract for login UI state, auth status, visible navigation, and route visibility inputs

## Concrete recommendations

1. Treat Vuex→Pinia migration separately from transport/query redesign.
2. Treat query ownership separately from backend client implementation.
3. Move theming to app-shell CSS variables, Tailwind token mapping, and Naive theme integration.
4. Remove shell polling and imperative global listeners from route components where query/composables can own them.
5. Redesign `@noob-naive-ui/admin` around shell/auth/navigation/runtime concerns only; move concrete admin operations out to backend-specific starters or app code.
6. Define explicit frontend runtime contracts for:
   - login form submission and login-page state
   - frontend-ready auth status
   - visible route keys / route-visibility inputs
   - frontend-ready menu/navigation tree
