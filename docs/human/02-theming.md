# Theming (host side)

This guide covers theming from the app developer's point of view: theme
presets, provider wiring, and font sizes. If you are authoring a component
that reads theme values, see [Authoring Components](05-authoring-components.md).

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
preset updates the naive-ui theme.

## Font size tiers

naive-ui sets `body { font-size: 14px }` statically. The framework adds
size-keyed values so content can scale. Values can carry per-size tiers:

```ts
padding: { small: "0.75rem", medium: "1rem", large: "1.25rem" }
```

A leaf value can be a plain string or a record keyed by font size. The
active font size resolves the leaf at runtime.

## Per-library overrides

A host can override theme values for a whole library. Use the per-package
config providers:

```tsx
import { AdminUiConfigProvider } from "@noob-naive-ui/ui";

<AdminUiConfigProvider
  themeOverride={{
    CardTabs: { backgroundColor: "#fafafa" },
  }}>
  {/* app tree */}
</AdminUiConfigProvider>
```

The provider merges your slice into the shared override registry. Nearest
provider wins for its subtree.

## Color scheme and body background

naive-ui's `NGlobalStyle` writes the body background from the merged theme.
The admin's override merge must not mutate the base overrides table. The
framework uses `toMerged` from `es-toolkit` for this, so switching from a
dark preset back to light restores the light body background.

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

- [i18n (host side)](03-i18n.md) — host locale messages
- [Authoring Components](05-authoring-components.md) — theme vars and i18n
  inside a component
