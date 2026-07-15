# Define Tailwind package consumption boundary

## Goal

Make `@noob-naive-ui/ui` a Tailwind-capable CSS library with a public stylesheet artifact, let `@noob-naive-ui/admin` aggregate that artifact through its own public stylesheet, and convert demo-authored layout/page styling from plain CSS to its own scoped Tailwind build.

## Confirmed facts

- `@noob-naive-ui/admin` already runs `@tailwindcss/vite`, emits `./style.css`, and scans only `src/components`.
- `@noob-naive-ui/ui` is a Vite library but currently has no Tailwind plugin, stylesheet entry/import, CSS output name, or `./style.css` package export.
- The demo explicitly imports public admin CSS but its local page/layout styling is currently plain CSS.
- Tailwind’s official Vite integration uses `@tailwindcss/vite`; Tailwind v4 supports `source(none)` plus explicit `@source` directives to prevent accidental scanning outside the owning package.

## Requirements

1. Add Tailwind Vite tooling to `@noob-naive-ui/ui`; its entrypoint must import a library-owned stylesheet and its package must export compiled `./style.css`.
2. Scope UI Tailwind source detection to UI source. Do not add UI components or a broad public API.
3. Add `@noob-naive-ui/ui` as an admin workspace dependency. Aggregate UI's exported stylesheet from admin's public stylesheet.
4. Make focused admin build, typecheck, and test commands build UI first, so clean-checkout package resolution never relies on a pre-existing `dist` directory.
5. Add Tailwind Vite tooling to the demo. Scope its scanner to `apps/demo/src`; replace plain local layout/page CSS with static Tailwind utility classes in the demo's local TSX components.
6. Preserve the existing public admin runtime boundary, demo auth/router/tab behavior, and explicit `@noob-naive-ui/admin/style.css` import.

## Acceptance criteria

- [ ] `@noob-naive-ui/ui` builds a `dist/style.css` artifact and exposes it via `@noob-naive-ui/ui/style.css`.
- [ ] `@noob-naive-ui/admin` resolves/imports UI's public stylesheet through a declared workspace dependency and clean focused commands build UI first.
- [ ] `pnpm --filter @noob-naive-ui/ui typecheck && pnpm --filter @noob-naive-ui/ui build` pass.
- [ ] `pnpm --filter @noob-naive-ui/admin typecheck`, `test`, and `build` pass from a state with no UI build artifacts.
- [ ] Demo styles are generated from its own Tailwind source scan, not by scanning any library source directory.
- [ ] `pnpm --filter demo typecheck` and `build` pass; the browser still proves login, local navigation/tab actions, sign out, and no application API request.

## Out of scope

- Adding UI components or changing the existing UI theme-bridge public API.
- Adding application backend behavior, persistence, or routing ownership to a shared package.
- Requiring a future starter to use Tailwind.

## Sources

- https://tailwindcss.com/docs/installation/using-vite
- https://tailwindcss.com/docs/detecting-classes-in-source-files
