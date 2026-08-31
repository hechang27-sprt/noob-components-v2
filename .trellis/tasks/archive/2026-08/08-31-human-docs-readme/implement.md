# Implement: Human-facing docs + README (EN / zh-CN)

## Ordered checklist

1. **Verify source-of-truth snippets** (already surveyed; re-check during writing):
   - `pnpm --filter demo dev` (Vite dev, port 5173)
   - `pnpm --filter demo typecheck` / `pnpm -r typecheck`
   - Public exports: `@noob-naive-ui/admin` (AdminProvider/AdminShell/
     AdminLoginPage/useAdminShell), `@noob-naive-ui/ui` (UiCard, CardTabs,
     useUiTheme), `@noob-naive-ui/registry` (useTheme/useCssVarsFor),
     `@noob-naive-ui/i18n` (createComponentI18n/getComponentI18n)
2. **Write README.md (EN)**: title, WIP badge/note, stack, quickstart
   (install → dev → typecheck → build), package map table, links to docs/human.
3. **Write README.zh-CN.md**: full Simplified Chinese translation, same structure.
4. **Write docs/human/01-getting-started (EN)**: prerequisites, workspace,
   run demo, login flow, register a route + menu, add a page.
5. **Write docs/human/01-getting-started.zh-CN.md**: translation.
6. **Write docs/human/02-theming (EN)**: theme presets (light/dark), naive-ui
   overrides, `useUiTheme`/CSS vars, font-size tiers, tailwind single-import rule.
7. **Write docs/human/02-theming.zh-CN.md**: translation.
8. **Write docs/human/03-i18n (EN)**: `createComponentI18n`, locale JSON,
   `NoobUiLocale` augmentation + import rule, host root-composer fallback.
9. **Write docs/human/03-i18n.zh-CN.md**: translation.
10. **Write docs/human/04-architecture (EN)**: package roles, override registry
    (LibraryOverridesRegistry / libId), admin shell data flow, demo as reference.
11. **Write docs/human/04-architecture.zh-CN.md**: translation.
12. **Cross-link check**: README ↔ docs/human; relative links valid.
13. **Validation**: `head`/grep spot-check all files; ensure no openwiki edits,
    no code changes; `jj diff --summary` to confirm only docs/README changed.

## Validation commands

- `ls docs/human/` — expects 8 files (4 pairs)
- `ls README.md README.zh-CN.md`
- `jj diff --summary` — only docs + README files
- Spot-check commands match repo (grep for `pnpm --filter demo dev` etc.)

## Risks / notes

- zh-CN translation must be a faithful translation, not a loose paraphrase.
- Keep code snippets consistent with current public APIs (verify each snippet
  against source before writing).
- openwiki/ is OFF-LIMITS this task.
