# Authoring Components

This guide explains how to write a component inside a framework package
(for example `packages/ui`). It covers theme variables, the compound
component pattern, and component i18n.

Host-side configuration is a separate concern. See
[Theming (host side)](02-theming.md) and [i18n (host side)](03-i18n.md)
for the app developer's view.

## Theme variables in a component

A component reads its values from CSS custom properties. The registry
package maps declared defaults to variable names. There is **no global
theme store**. Unlike naive-ui's `useThemeVars()`, there is no API that
retrieves the default theme variable values. Defaults live in the
component source and are passed to the helper at each call.

Example variable name:

```css
--noob-ui-card-tabs-background-color: #fff;
```

The name has the form `--<prefix>-<component>-<var>`.

### 1. Declare the theme variable schema

`NoobUiThemeComponents` is the empty augmentation hook for the ui
package. Declare your component's slice:

```ts
// packages/ui/src/components/card-tabs/theme.ts (example)
declare module "@noob-naive-ui/ui" {
  interface NoobUiThemeComponents {
    CardTabs: CardTabsThemeVars;
  }
}
```

The merged interface gives typed overrides and a typed component key.

### 2. Map defaults to CSS variables

`useUiTheme(componentId, defaults)` maps the component's defaults to a
CSS custom property record:

```tsx
import { useUiTheme } from "@noob-naive-ui/ui";

// card-tabs/root.tsx
const getDefaults = () => ({
  backgroundColor: nThemeVars.value.bodyColor,
  activeCardColor: nThemeVars.value.cardColor,
});
const themeVars = useUiTheme("CardTabs", getDefaults);

return () => (
  <div style={themeVars.value}>
    {/* bound as inline CSS variables */}
  </div>
);
```

`defaults` can be a plain object or a getter. Use the getter when a
default depends on a reactive source. For example naive-ui's
`useThemeVars()` returns a ref. The getter runs inside the computed, so
the dependency re-evaluates when the theme changes.

The helper also merges a host-provided override slice from the shared
registry. The component default loses to the host override for the same
variable.

`useUiTheme` is a thin wrapper over the registry's `useTheme`:

```ts
useTheme({
  libraryId: "noob-naive-ui:ui",
  cssPrefix: "noob-ui",
  componentId: "CardTabs",
  defaults,
});
```

### 3. Reference variable names safely

`useUiCssVarsFor(componentId)` returns typed helper functions:

```ts
const { $css, $var, $tw } = useUiCssVarsFor("CardTabs");

$css("--noob-ui-card-tabs-background-color"); // the key itself
$var("--noob-ui-card-tabs-background-color"); // var(...) wrapper
$tw("bg-(--noob-ui-card-tabs-background-color)"); // tailwind class form
```

Use these in JSX. The three helpers are anti-drift protections: their
parameter types are constrained to the exact CSS variable names derived from
the schema (`backgroundColor` → `--noob-ui-…-background-color`). If you rename
a schema property, references using the old variable name fail typecheck, so
stale JSX strings are flagged at compile time instead of silently breaking.
You update the flagged usages; nothing updates automatically.

### 4. Tailwind classes and CSS variables

Tailwind scans source text for class candidates. It does not evaluate
JavaScript. This shapes how components use utilities.

The supported pattern has two parts.

First, a static utility class reads a CSS variable by name:

```tsx
class="bg-(--noob-ui-card-tabs-background-color)"
```

Tailwind generates this rule once at build time:

```css
.bg-\\(--noob-ui-card-tabs-background-color\\) {
  background-color: var(--noob-ui-card-tabs-background-color);
}
```

Second, the dynamic value flows through the variable via inline style:

```tsx
<div
  style={themeVars.value}
  class={$tw<"bg">("bg-(--noob-ui-card-tabs-background-color)")}>
```

Tailwind finds the literal class string during scanning. Runtime value
changes only update the CSS variable, so no new utility rules are needed.

Patterns that interpolate expressions into class names are a mistake:

```tsx
// Wrong — Tailwind cannot evaluate these during scanning
class={`bg-[${getBackground()}]`}
class={`bg-(${getMyCssVar()})`}
```

The scanner sees no complete literal candidate, so no rule is generated
and the element gets no background. Whole literal strings still scan
correctly, for example inside ternary branches. Only interpolated
fragments break.

## The compound component pattern

Framework components follow a namespace API like Vuetify 0. A compound
component exports `{ Root, Sub }` instead of one big component:

```ts
// packages/ui/src/components/card-tabs/index.ts
export const CardTabs = { Root, Tab };
```

`Root` owns layout and state. `Tab` registers with a shared controller.
The controller is provided through Vue's provide/inject:

```ts
// runtime.ts
const controller = createTabController(options);
provide(CONTROLLER_PROVIDE_KEY, controller);
```

Children read the same controller and unregister on unmount. The CardTabs
controller keeps tabs in DOM order and supplies keyboard navigation.

## Component i18n

A component that translates its own strings creates a local composer:

```tsx
import { createComponentI18n } from "@noob-naive-ui/i18n";
import exampleMessages from "../../locales/Example.json";

const { t } = createComponentI18n({
  messages: exampleMessages,
  libraryId: "noob-naive-ui:ui",
  componentId: "Example",
});

// t("title") resolves against Example.json for the active locale
```

`getComponentI18n` resolves the nearest component composer from a
descendant:

```tsx
const { t } = getComponentI18n();
```

Missing keys fall back to host messages through the root composer.

### Declare the locale schema

The framework derives locale types from the override registry. Each
package declares its full schema once:

```ts
// packages/ui/src/registry.ts
declare module "@noob-naive-ui/registry" {
  interface LibraryOverridesRegistry {
    "noob-naive-ui:ui": {
      locale: Record<NoobUiLocaleName, NoobUiLocale>;
      theme: NoobUiThemeComponents;
    };
  }
}
```

One component then registers its message slice:

```ts
// packages/ui/src/components/example/i18n.ts
declare module "@noob-naive-ui/ui" {
  interface NoobUiLocale {
    Example: NoobUiExampleLocale;
  }
}
```

Important: a side-effect module that only augments types must be imported
somewhere in the compilation graph. Otherwise TypeScript never sees the
augmentation and the component key resolves to `never`.

```ts
import "./i18n"; // register the NoobUiLocale augmentation
```

## Checklist for a new component

1. Create the component folder under `packages/ui/src/components/`.
2. Declare the theme variable schema in the augmentation file.
3. Call `useUiTheme` with a defaults getter.
4. Add a separate i18n augmentation file and import it.
5. Export the compound namespace from the package barrel.

## What's next

- [Theming (host side)](02-theming.md) — presets and providers
- [i18n (host side)](03-i18n.md) — host messages
- [Architecture](04-architecture.md) — package roles and data flow
