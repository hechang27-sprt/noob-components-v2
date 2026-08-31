# Getting Started

This guide shows you how to run the framework and add your first page.
The demo app (`apps/demo`) is the reference example.

## Prerequisites

- Node.js 20 or newer
- pnpm 11

## Install and run

```bash
pnpm install
pnpm --filter demo dev
```

Open `http://localhost:5173`.

Sign in with any non-empty username and password. The login is
frontend-only and in memory. It makes no HTTP calls. There is no password
check in the demo.

## Where things live

The workspace uses pnpm. The app you run is `apps/demo`. The framework
packages live under `packages/`.

| Path | Contents |
| --- | --- |
| `apps/demo/src/main.ts` | App setup: pinia, i18n, router, providers |
| `apps/demo/src/App.tsx` | Root component: `AdminProvider` and route view |
| `apps/demo/src/routes.ts` | Route registry bound to the shell |
| `apps/demo/src/pages/` | Host-owned pages |
| `apps/demo/src/themes.ts` | Theme presets |
| `apps/demo/src/locales/` | Host locale messages |

## Add a page

A page is a Vue component that renders inside the shell.

1. Create `apps/demo/src/pages/demo/hello-demo-page.tsx`:

```tsx
import { defineComponent } from "vue";
import { NH3, NP } from "naive-ui";

export const HelloDemoPage = defineComponent(() => {
  return () => (
    <div>
      <NH3>Hello</NH3>
      <NP>This page lives inside the admin shell.</NP>
    </div>
  );
});
```

2. Register a route in `apps/demo/src/routes.ts`:

```ts
import { defineAdminRouteRegistry } from "@noob-naive-ui/admin-vue-router";
import { HelloDemoPage } from "./pages/demo/hello-demo-page";

export const demoRouteRegistry = defineAdminRouteRegistry({
  // ... existing routes
  hello: {
    route: {
      path: "hello",
      component: HelloDemoPage,
    },
  },
});
```

3. Add a menu item in `apps/demo/src/App.tsx`. The menu function builds
`MenuOption[]` from naive-ui:

```tsx
function createDemoMenu(): MenuOption[] {
  return [
    // ... existing entries
    createMenuOption("hello", "nav.hello"),
  ];
}
```

4. Add the label in `apps/demo/src/locales/demo.json`:

```json
{
  "en": { "nav": { "hello": "Hello" } }
}
```

## Add a locale

The demo owns its messages. Add the `zh-CN` slice next to `en` in
`apps/demo/src/locales/demo.json`:

```json
{
  "en": { "nav": { "hello": "Hello" } },
  "zh-CN": { "nav": { "hello": "你好" } }
}
```

The shell switches locale from the preferences control. The active locale
seeds the global vue-i18n composer.

## Verify

```bash
pnpm --filter demo typecheck
pnpm --filter demo dev
```

Typecheck runs `tsc -p tsconfig.json --noEmit` on the demo project.

## What's next

- [Theming](02-theming.md) — theme presets and CSS custom properties
- [i18n](03-i18n.md) — component-level locale schemas
- [Architecture](04-architecture.md) — package roles and data flow
