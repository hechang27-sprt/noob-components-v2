# Implementation Plan: Refine Prototype I18n Boundaries

## 1. Package API and Iteration

- Add `tsafe` as a prototype package dependency.
- Remove fallback-locale fields/constants/exports from plugin state and API.
- Change override selection to accept the message tree directly.
- Replace both `Object.entries` loops and locale casts with `objectEntries`.
- Destructure injected messages and safe Composer data refs; keep methods qualified to satisfy type-aware `unbound-method` lint and retain the Composer object for `fallbackRoot = false`.
- Remove package fallback instrumentation.

## 2. Shared Workspace Vite Integration

- Use one repository-owned `createWorkspaceVueI18nPlugin()` preset covering conventional app/package locale directories.
- Keep package source-resource paths out of package exports and consuming Vite configs.
- Preserve the existing source alias and no-build behavior; built-package consumers require no workspace preset.

## 3. Host Fallback Harness

- Read `prototypeGlobalFallback` before global Composer creation.
- Configure `createI18n()` with that host-owned fallback.
- Remove package-plugin fallback installation and its type import.
- Keep immutable override and active-locale query scenarios.

## 4. Documentation Reconciliation

- Update the archived prototype findings, parent PRD/design, and shared i18n contract.
- Clearly separate built-package consumption from source-consumed workspace integration.
- Remove claims that the package plugin owns or defaults fallback locale.

## 5. Verification

Run:

```bash
pnpm install --no-frozen-lockfile
pnpm --filter @noob-naive-ui/prototype-i18n-verification typecheck
pnpm --filter @noob-naive-ui/prototype-i18n-verification build
pnpm --filter demo typecheck
pnpm --filter demo build
pnpm exec oxlint --type-aware packages/prototype-i18n-verification apps/demo
pnpm format:check
```

Browser scenarios:

1. No plugin: English defaults render.
2. `prototypeI18n=override&prototypeLocale=en`: partial override wins, sibling remains, caller mutation has no effect.
3. `prototypeGlobalFallback=zh-CN&prototypeLocale=fr`: global/local active locale remains `fr`, rendered package text uses Chinese fallback.
4. Existing preference locale changes propagate after mount and survive reload.
5. Final scenario has no browser warnings, errors, page errors, or failed requests.

## Risky Files / Rollback Points

- `packages/prototype-i18n-verification/package.json` and lockfile: dependency/subpath export resolution.
- Package-root Vite helper: must load before package build under the no-build workspace.
- `prototype-card.tsx`: fallback isolation must remain while fallback ownership moves to root.
- Shared/parent docs: stale plugin-owned fallback statements must be removed consistently.
