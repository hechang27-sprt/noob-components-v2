# Architecture

The workspace follows one rule: the application owns policy, the packages
own reusable behavior. The demo app (`apps/demo`) supplies routes, menu
trees, themes, and messages. The packages render the shell around them.

## Package roles

| Package | Responsibility |
| --- | --- |
| `@noob-naive-ui/registry` | Override registry, `useTheme`, font-size resolution |
| `@noob-naive-ui/ui` | Reusable components (UiCard, CardTabs, useUiTheme) |
| `@noob-naive-ui/admin` | Shell chrome: `AdminProvider`, `AdminShell`, `AdminLoginPage`, stores |
| `@noob-naive-ui/i18n` | `createComponentI18n`, `getComponentI18n`, resolvers |
| `@noob-naive-ui/admin-vue-router` | Vue Router plugin bound to shell page instances |
| `apps/demo` | Host app: routes, menu, themes, messages, frontend-only auth |
| `apps/admin-starter` | Placeholder for a future copy-from-demo template |

## The override registry

`@noob-naive-ui/registry` hosts `LibraryOverridesRegistry`. Each library
augments it with its full locale and theme types:

```ts
declare module "@noob-naive-ui/registry" {
  interface LibraryOverridesRegistry {
    "noob-naive-ui:ui": {
      locale: Record<NoobUiLocaleName, NoobUiLocale>;
      theme: NoobUiThemeComponents;
    };
  }
}
```

Derived types flow from this one declaration. They produce the i18n
override tree (`RegistryI18nOverrides`) and the theme override tree
(`RegistryThemeOverrides`). The registry has no string index, so the
derived projections stay per-library typed.

At runtime, the per-package config providers (`AdminConfigProvider`,
`AdminUiConfigProvider`) build a computed registry value and provide it
under `libraryOverridesKey`. Components read their own library's slice.

## Theming data flow

1. The host defines theme presets (`AdminThemePreset[]`).
2. `AdminProvider` reads the active preset from the preferences store.
3. The naive-ui config merge builds theme + overrides with `toMerged`.
4. `NGlobalStyle` writes the body background from the merged theme.
5. A component passes its local defaults to `useTheme` / `useUiTheme`.
6. The helper maps defaults plus any host override slice to CSS custom
   properties.

There is no global theme store you can query for default theme variable
values (unlike naive-ui's `useThemeVars()`). Defaults come from component
source. See [Authoring Components](05-authoring-components.md) for details.

## i18n data flow

1. The host seeds its messages into the global vue-i18n composer.
2. A package component calls `createComponentI18n` with packaged defaults.
3. The function builds a local composer from those defaults.
4. It merges the component's override slice from the registry.
5. Missing keys fall back to host messages through the root composer.

Packaged defaults come from the component's locale JSON. There is no
global message store you can query for a package's default messages. See
[Authoring Components](05-authoring-components.md) for details.

## Shell and router

`AdminShell` renders navigation, page instances, and preferences. It is
router-neutral. `@noob-naive-ui/admin-vue-router` connects Vue Router to
shell page instances: routes are declared with `defineAdminRouteRegistry`,
and destinations carry a URL codec (`defineAdminRouteUrlCodec`) validated
with zod.

The host owns the router history and the route components. The shell owns
the tab strip and the open-page registry. See
[Admin Router](06-admin-vue-router.md) for dynamic routes and payload
encoding.

## Auth boundary

Auth is host-owned. `@noob-naive-ui/admin` provides the frontend-only
auth store (`useAdminAuthStore`) with statuses such as loading,
unavailable, anonymous, and authenticated. It is presentation state, not a
session or credential. The host performs any real authentication.
