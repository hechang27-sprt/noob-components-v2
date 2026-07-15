# Design: Tailwind package distribution

UI owns its Tailwind compilation and imports `src/style.css` from its public entry. Vite emits `dist/style.css`; the manifest exposes it and marks CSS side-effectful. UI source scanning is restricted to `src`.

Admin declares UI as `workspace:*`, builds UI in `prebuild`, `pretypecheck`, and `pretest`, and imports only `@noob-naive-ui/ui/style.css` from its public stylesheet. This yields `ui → admin → demo` for focused commands because demo already builds admin first.

Demo gets its own Vite Tailwind plugin and `src/style.css` uses `@import "tailwindcss" source(none)` plus an explicit `@source` for local source. Its route and slot-layout classes become static Tailwind utilities. It continues importing compiled admin CSS; it never scans UI/admin source.
