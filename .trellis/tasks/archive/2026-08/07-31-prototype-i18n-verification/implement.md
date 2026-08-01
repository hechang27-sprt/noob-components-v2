# Prototype i18n verification implementation plan

## Ordered implementation

1. Scaffold private package `packages/prototype-i18n-verification` using existing library package conventions.
2. Add one `PrototypeCard` component and `src/locales/PrototypeCard/{en,zh-CN}.json`.
3. Configure package JSON imports, Vue I18n precompilation, peer externalization, build, and typecheck.
4. Implement the minimal override provider plugin with an immutable startup message snapshot; fallback remains host-owned.
5. Implement the component-local Composer and two-stage default/override `mergeLocaleMessage()` sequence.
6. Add the package to the demo's workspace dependencies and source aliases; expose package-owned Vite resource integration for the existing no-build workspace convention.
7. Create and install the demo's global Vue I18n instance with host-owned fallback configuration.
8. After `preferences.initialize(...)`, add an immediate watcher from `preferences.locale` to `i18n.global.locale.value`.
9. Render `PrototypeCard` in a visible demo location.
10. Build/typecheck the package and demo, then drive the locale selector in a browser to verify English, `zh-CN`, persistence/reload, overrides, immutability, and fallback.
11. Record observed JSON typing, precompilation, build, and runtime behavior in the child task and feed the conclusion back into the parent design.

## Expected verification commands

Confirm exact scripts after scaffolding against existing package conventions:

```sh
pnpm --filter @noob-naive-ui/prototype-i18n-verification build
pnpm --filter @noob-naive-ui/prototype-i18n-verification typecheck
pnpm --filter demo build
pnpm --filter demo typecheck
pnpm format:check
```

Run the demo and use a real browser for the locale-switch scenario; build commands alone do not prove locale inheritance.

## Risks

- Demo source consumption may require the demo Vite plugin include path to cover prototype JSON resources explicitly.
- Passing imported defaults directly to `useI18n({ messages })` and then merging overrides can mutate module-level resources; always start with a fresh empty local Composer.
- The preference watcher must be created only after `preferences.initialize(...)` so persisted locale restoration is authoritative.
- The plugin must snapshot caller options so later caller mutation cannot affect future mounts.
- Prototype code must remain isolated; do not translate or refactor production packages during this task.

## Dependency and completion gate

This child depends on the architecture decisions in parent task `07-31-library-i18n-integration`. Do not start implementation until this revised plan is approved. Completion requires feeding the observed result back into the parent design before any production implementation begins.
