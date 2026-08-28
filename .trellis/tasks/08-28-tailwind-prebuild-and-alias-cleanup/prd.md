# Tailwind CSS Dedup + Path Alias Cleanup

## Goal

Eliminate 3x duplicate Tailwind utility classes in the browser and simplify path resolution across all vite configs.

## Background

Tailwind v4 generates utilities per CSS entry-point. When library packages (`ui`, `admin`) each import `tailwindcss/utilities.css`, Vite creates separate CSS bundles — resulting in **3x duplicate utilities** in the browser.

## Root Cause

Each `@import "tailwindcss/utilities.css"` in a CSS file creates a separate Tailwind entry. Vite processes each CSS file independently, so `ui/style.css`, `admin/style.css`, and `demo/style.css` each get their own Tailwind scanner and output.

## Solution

**Library packages don't import Tailwind.** Only the consumer does.

```
ui/style.css:    @layer ... ; @source "."
admin/style.css: @layer ... ; @import ui/style.css ; @source "./components"
demo/style.css:  @layer ... ; @import tailwindcss/* ; @import admin/style.css
```

The `@source` directives in library CSS ARE picked up through the import chain. The consumer's single Tailwind entry scans all source files.

## Verified Results

- Single Tailwind sheet in browser (Sheet #5)
- Zero Tailwind utility duplicates
- All e2e tests pass (BUG 1, BUG 2, card-tabs)
- All typechecks pass

## Acceptance Criteria

- [x] Browser DevTools shows 0 duplicate Tailwind utility selectors
- [x] Theme switching e2e tests (BUG 1 + BUG 2) pass
- [x] Card-tabs render correctly (overflow-x, CSS vars, width)
- [x] All packages pass `tsc --noEmit`
- [x] All vite configs use `tsconfigPaths: true`
- [x] Dev server works correctly

## Out of Scope

- Pre-built CSS / CLI build step (not needed — solution is structural)
- Changing Tailwind class usage patterns in components
- Modifying consumer styling approach
