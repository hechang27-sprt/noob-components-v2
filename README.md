# Noob Components (V2)

> **WIP starter template.** The framework is under active development. Public
> APIs may change. The demo app is the reference example.

Noob Components is a starter template for building admin dashboards. It gives
you a working shell, a theming system, and i18n, all wired together. You add
your own pages, routes, and backend integration.

## Stack

- **Vite 8** build tool with `resolve.tsconfigPaths`
- **Vue 3.5** with JSX (`vue-jsx-vapor` plugin)
- **naive-ui** and **pro-naive-ui** for the shell and form components
- **Tailwind CSS 4** for utilities
- **pinia** for state
- **vue-router** for navigation
- **vue-i18n** for messages
- **zod** for runtime validation

## Workspace

This is a pnpm workspace.

| Package | Role |
| --- | --- |
| `@noob-naive-ui/registry` | Override registry, `useTheme`, font-size resolution |
| `@noob-naive-ui/ui` | Reusable components (UiCard, CardTabs) |
| `@noob-naive-ui/admin` | Admin shell: provider, shell, login page, stores |
| `@noob-naive-ui/i18n` | Component i18n helpers |
| `@noob-naive-ui/admin-vue-router` | Vue Router ↔ AdminShell adapter |
| `apps/demo` | Runnable reference app (frontend-only login) |
| `apps/admin-starter` | Placeholder (not yet scaffolded) |

## Quickstart

Prerequisites: Node.js 20+, pnpm 11.

```bash
pnpm install
pnpm --filter demo dev
```

Open `http://localhost:5173`. Sign in with any non-empty username and
password. The demo uses an in-memory, frontend-only login. It makes no HTTP
calls.

Other commands:

```bash
pnpm -r typecheck   # typecheck all packages
pnpm -r build       # build all packages
pnpm lint           # lint (oxlint)
```

## What you get

- A working login page and app shell (`AdminProvider`, `AdminShell`)
- Theme presets that switch light/dark and react to the browser color scheme
- A theming system built on CSS custom properties
- Component i18n with host message fallback
- A tabbed page system wired to vue-router

## Guides

Docs live in `docs/human/` in English and Simplified Chinese.

- [Getting Started](docs/human/01-getting-started.md)
- [Theming](docs/human/02-theming.md)
- [i18n](docs/human/03-i18n.md)
- [Architecture](docs/human/04-architecture.md)

## Status

This is a WIP starter template. The demo app (`apps/demo`) is the reference
for how to use the framework. `apps/admin-starter` is a future template that
copies the demo structure.
