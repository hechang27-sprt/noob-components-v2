# Human-facing docs + README (EN / zh-CN)

## Goal

Write human-facing getting-started documentation and a bilingual README that
present the framework as a **WIP starter template for an admin dashboard**
built on Vite 8 + Vue JSX (vue-jsx-vapor) + naive-ui + pro-naive-ui, with the
theming system and i18n hooked up and ready to extend.

## Confirmed Facts (from repo survey)

### Tech stack (root package.json / workspace)
- pnpm workspace: `packages/registry`, `packages/ui`, `packages/admin`,
  `packages/i18n`, `packages/admin-vue-router`, `apps/demo`, `apps/admin-starter`
- Vite 8 (`vite@^8.1.3`) with `resolve.tsconfigPaths: true`
- Vue `^3.5.39`; JSX via `vue-jsx-vapor` (`interop: true, macros: true`),
  components declared `defineComponent` + render function → VDOM output
- naive-ui `^2.44.1`, pro-naive-ui `^3.2.3`, tailwindcss `^4.3.2`
- pinia `^3.0.4`, vue-router `^4.5.1`, vue-i18n `^11.4.8`, zod `^4.4.3`
- TypeScript 7 (`@typescript/typescript6` alias devDep), oxlint / oxfmt

### Package roles (from CONTEXT.md + source)
- **registry** (`@noob-naive-ui/registry`): framework-wide override registry,
  `useTheme` / `useCssVarsFor`, theme-font-size resolution, locale schema
  derivations (`LibraryOverridesRegistry` augments per library)
- **ui** (`@noob-naive-ui/ui`): reusable presentational components
  (UiCard, CardTabs compound API, Example), `useUiTheme`, style.css
- **admin** (`@noob-naive-ui/admin`): the admin shell application chrome —
  `AdminProvider`, `AdminShell`, `AdminLoginPage`, auth/navigation stores,
  theme presets + naive-ui config merge
- **i18n** (`@noob-naive-ui/i18n`): `createComponentI18n` / `getComponentI18n`,
  i18n-text resolvers, global composer sync
- **admin-vue-router** (`@noob-naive-ui/admin-vue-router`): Vue Router
  integration plugin for AdminShell page instances
- **demo** (`apps/demo`): runnable reference starter — frontend-only login,
  host-owned routes/menu, themes (`themes.ts`), locale messages, Pinia setup
- **admin-starter** (`apps/admin-starter`): unscaffolded manifest-only
  placeholder

### Theming
- `useTheme` (registry) accepts defaults as plain object or getter fn; drives
  CSS custom properties via `useCssVarsFor` / `useUiTheme`
- naive-ui theme presets are host-authored (light/dark), resolved against
  active font-size tier; body bg bug fixed with non-mutating `toMerged`
- Tailwind v4: library packages do NOT import tailwindcss; only the app
  entry imports it once (avoids 3x utility duplication)

### i18n
- Registry-keyed locale schemas via module augmentation
  (`NoobUiLocale` / `LibraryOverridesRegistry`); side-effect augmentation
  modules must be imported to register
- vue-i18n `createComponentI18n` per component; `getComponentI18n` for
  descendants; host root-composer fallback

## Requirements (multi-guide structure — user-approved)

### File layout

```
README.md / README.zh-CN.md          → WIP starter template intro, stack,
                                        quickstart (dev loop), doc links
docs/human/
  01-getting-started.{md,zh-CN.md}   → install, dev server, first page, menu/routes
  02-theming.{md,zh-CN.md}           → presets, useUiTheme/CSS vars, font size, tailwind notes
  03-i18n.{md,zh-CN.md}              → createComponentI18n, locale schemas, augmentation
  04-architecture.{md,zh-CN.md}      → package roles, override registry, data flow
```

### Content rules
1. Frame framework as WIP starter template for admin dashboards
   (Vite 8 + Vue JSX + naive-ui + pro-naive-ui), theming + i18n ready.
2. Use the demo app (`apps/demo`) as the reference runnable example;
   note `apps/admin-starter` is unscaffolded.
3. Bilingual: each doc has an English file and a Simplified Chinese file.
4. Docs must match actual public APIs / package roles (verified against code).
5. Do not touch `openwiki/`.

## Acceptance Criteria

- [ ] `docs/human/` contains 4 guide pairs (EN + zh-CN)
- [ ] Root `README.md` + `README.zh-CN.md` written
- [ ] Docs reflect actual public APIs / package roles
- [ ] Quickstart commands match repo (`pnpm --filter demo dev`, etc.)
- [ ] No `openwiki/` edits
- [ ] Markdown renders cleanly (no broken links between docs)

## Out of Scope

- `openwiki/` regeneration
- Code changes / API changes
- Replacing agent-facing docs (docs/agents, AGENTS.md)
