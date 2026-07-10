# ProLayout integration research

## User-requested browser review

The linked Pro Naive UI documentation and example directory were opened and inspected in a real browser:

- https://naive-ui.pro-components.cn/zh-CN/os-theme/components/layout
- https://github.com/Zheng-Changfu/pro-naive-ui/tree/master/packages/components/src/layout/demos/zhCN

The example directory includes `basic.demo.vue`, `config.vue`, and `menus.demo.vue`. The basic example confirms direct composition of `ProLayout`, controlled `v-model:collapsed`, enabled `show-tabbar`, documented named slots, and an explicit-height wrapper around the layout.

- https://raw.githubusercontent.com/Zheng-Changfu/pro-naive-ui/master/packages/components/src/layout/demos/zhCN/basic.demo.vue

## Observed `ProLayout` contract

Pro Naive UI **3.2.3** documents and exports:

- `collapsed` plus `onUpdate:collapsed`, `showSidebar`, and `showTabbar` props.
- Named slots `nav-left`, `nav-center`, `nav-right`, `sidebar`, `tabbar`, and `default`.
- A default slot as the content region and a reserved `tabbar` slot.
- A `height: 100%` layout root; its own basic demo establishes a containing height (`h-500px`).

## Published package contract

Official repository/source:

- https://github.com/Zheng-Changfu/pro-naive-ui/tree/master/packages/components
- https://raw.githubusercontent.com/Zheng-Changfu/pro-naive-ui/master/packages/components/package.json
- https://raw.githubusercontent.com/Zheng-Changfu/pro-naive-ui/master/packages/components/src/layout/props.ts
- https://raw.githubusercontent.com/Zheng-Changfu/pro-naive-ui/master/packages/components/src/layout/slots.ts

The published dependency is `pro-naive-ui` version `3.2.3`. It exports `ProLayout` from the package root. Its peer dependencies are `naive-ui` and Vue; it does not require `vue-router`.

## Task 6 decision

- The authenticated `AdminShell` frame composes `ProLayout` inside a page-height wrapper, binds `sidebarCollapsed` through `collapsed` / `onUpdate:collapsed`, and renders runtime controls in a documented navigation slot.
- `AdminShell` itself renders a browser-like local open-tab UI into ProLayout's `tabbar` slot. It exposes no public `tabbar` slot.
- The tab contract is router-neutral: an optional `AdminShellTabController` contains an authoritative `current` frontend descriptor plus required async `activate` and `close` callbacks. The starter maps routes and navigates; the shell owns local tab membership, not router state.
- The default slot is the only starter-to-shell content seam. It maps to ProLayout's default slot and is where the starter places `<router-view />`.
- `pro-naive-ui` must be an admin peer+dev dependency and Vite external. No `vue-router` dependency is added.
