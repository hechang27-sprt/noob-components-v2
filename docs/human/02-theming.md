# Theming

The framework has two layers of theming. naive-ui handles component colors.
The `@noob-naive-ui/registry` package handles CSS custom properties for
framework components.

## Theme presets

Theme presets live in the host app. See `apps/demo/src/themes.ts`.

A preset has a key, a label, an `isDark` flag, and naive-ui theme
overrides:

```ts
import type { GlobalThemeOverrides } from "naive-ui";
import type { AdminThemePreset } from "@noob-naive-ui/admin";

const preset: AdminThemePreset = {
  key: "midnight",
  label: { kind: "i18n", key: "themes.midnight" },
  themeOverrides: {
    "naive-ui": {
      common: {
        primaryColor: "#18a058",
        bodyColor: "#0f1220",
      },
    },
  },
  isDark: true,
};
```

The demo ships a light preset (`default`) and a dark preset (`midnight`).
The browser color scheme chooses between them while the stored mode is
`"system"`.

The shell renders the preset list in the preferences control. Switching a
preset updates the naive-ui theme and the CSS custom properties at once.

## CSS custom properties for framework components

Framework components read their values from CSS custom properties. Example:

```css
--noob-ui-card-tabs-background-color: #fff;
```

Components bind these in three ways:

- **Defaults** — provided by each component (`useUiTheme` getter).
- **Provider overrides** — partial values from the app's config provider.
- **Computed values** — derived from the defaults (for example the
  col-template string in CardTabs).

The getter form matters. `useTheme` accepts a plain object or a getter
function. Use the getter when the default depends on reactive sources,
such as naive-ui's `useThemeVars()`:

```ts
const getDefaults = () => ({
  backgroundColor: nThemeVars.value.bodyColor,
  activeCardColor: nThemeVars.value.cardColor,
});
const vars = useUiTheme("CardTabs", getDefaults);
```

The getter runs inside a computed, so reactive sources re-evaluate when
they change.

## Color scheme and body background

naive-ui's `NGlobalStyle` writes the body background from the merged theme.
The admin's override merge must not mutate the base overrides table. The
framework uses `toMerged` from `es-toolkit` for this, so switching from a
dark preset back to light restores the light body background.

## Font size tiers

naive-ui sets `body { font-size: 14px }` statically. The framework adds
size-keyed values so content can scale:

```ts
padding: { small: "0.75rem", medium: "1rem", large: "1.25rem" }
```

A leaf value can be a plain string or a record keyed by font size. The
active font size resolves the leaf at runtime.

## Tailwind and the single import rule

Library packages do not import `tailwindcss/utilities.css`. Only the app
entry imports it. The app CSS does:

```css
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities) source(none);
```

Library CSS declares `@layer` ordering and `@source` paths only. Tailwind
picks these up through the import chain. This avoids duplicate utility
rules in the browser.

## What's next

- [i18n](03-i18n.md) — component-level locale schemas
- [Architecture](04-architecture.md) — package roles and data flow
