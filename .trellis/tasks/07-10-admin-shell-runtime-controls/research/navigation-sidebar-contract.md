# Sidebar research: direct starter-built `MenuOption[]`

## Sources inspected

- https://naive-ui.pro-components.cn/zh-CN/os-theme/components/layout
- https://github.com/Zheng-Changfu/pro-naive-ui/tree/master/packages/components/src/layout/demos/zhCN
- https://raw.githubusercontent.com/Zheng-Changfu/pro-naive-ui/master/packages/components/src/layout/props.ts
- https://raw.githubusercontent.com/Zheng-Changfu/pro-naive-ui/master/packages/components/src/layout/slots.ts
- https://raw.githubusercontent.com/tusen-ai/naive-ui/main/src/menu/src/interface.ts
- https://raw.githubusercontent.com/tusen-ai/naive-ui/main/src/menu/src/MenuOption.tsx

## Observed library behavior

- ProLayout exposes a `sidebar` slot; the upstream menu example composes direct `NMenu` there. It has no documented `menu` prop.
- `MenuOption` is Naive UI's native tree shape. It supports optional string/number keys, children, groups, dividers, `show`, `disabled`, labels/rendered labels, and HTML props.
- `NMenuOption` first selects its menu item, then invokes the component-level click handling. Raw `MenuOption.props` are node attributes, not an AdminShell-owned activation callback contract.

## Final Task 6/7 decision

The user simplified the boundary:

- `AdminShell` accepts `menuOptions?: MenuOption[]` directly and composes it unchanged through direct `NMenu` in ProLayout's `sidebar` slot.
- The starter builds the complete final tree: it owns visibility, nesting, keys, labels, router-aware link/rendered-label content, and all route behavior.
- `@noob-naive-ui/admin` does not consume `AdminRouteVisibility`, filter/clone/normalize menu options, attach `NMenu` selection callbacks, define an `AdminNavigation` component, or own a router/navigation controller.
- `AdminRouteVisibility` is obsolete and should be removed only after an LSP reference sweep. Existing public `AdminMenuTree` / `AdminRouteKey` aliases remain unchanged; the shell prop intentionally uses direct `MenuOption[]`.
- The default slot is the only starter content seam for `<router-view />`. The optional tab controller remains a separate frontend-only shell contract.

This supersedes the earlier proposed navigation-controller and recursive-filtering design. Do not use that discarded design during implementation or review.
