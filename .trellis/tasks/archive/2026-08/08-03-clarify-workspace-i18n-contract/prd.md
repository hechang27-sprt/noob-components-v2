# Clarify workspace i18n tooling contract

## Goal

Align the durable Vue I18n contract with the settled ownership boundary: `createWorkspaceVueI18nPlugin()` is optional monorepo development tooling for source-consumed packages and locale-file HMR, while bundled production package output remains self-contained. Replace the removed reload-driven demo harness with persistent automated coverage where the repository has a valid unit/component test seam.

## Confirmed Decisions

- `.node-version` requires Node `>=24`; Node-24 APIs in monorepo development tooling are allowed and need no compatibility workaround.
- The commented package-plugin installation in `apps/demo/src/main.ts` is intentional demonstration content and remains.
- `createWorkspaceVueI18nPlugin()` is optional. The demo dev server and production build must work without it; omitting it only removes source-locale HMR/development precompilation optimization.
- Built library output owns production locale precompilation. Downstream consumers of bundled packages do not use the workspace preset.
- Reload-driven URL query scenarios do not belong in the interactive demo.
- Override merge precedence, caller-mutation isolation, and host fallback behavior should be automated through unit/component tests where feasible; otherwise the source-edit demonstration is the explicit verification path.

## Requirements

1. Correct `.trellis/spec/ui/frontend/library-i18n-contract.md` so it no longer states or implies that the workspace preset is required for a successful source-consuming build.
2. Document the exact optional-tooling boundary: no preset means normal dev/build behavior but no locale-file HMR; package production builds still precompile their own locale resources.
3. Preserve the accepted flat locale-resource convention and current HMR mechanism.
4. Inspect existing package test infrastructure and add the smallest maintainable test seam needed for observable i18n contracts currently lacking automation.
5. Unit-test pure plugin behavior directly: defensive snapshotting and per-component override selection.
6. Component-test local Composer behavior only if the existing workspace test stack supports mounting Vue components without introducing a new dependency or bespoke harness. If not, document source-edit verification rather than adding infrastructure solely for this prototype.
7. Keep the interactive demo free of reload-driven query modes; retain its intentional commented override example.
8. Move the locale demonstration off Dashboard into a dedicated registered route at `demo/internationalization`, exposed in the sidebar as `Demo` > `Internationalization`.
9. Keep the routed composition in `apps/demo/src/components/internationalization-demo-page.tsx`; keep registry, menu, and tab-presentation ownership in their established files.

## Acceptance Criteria

- [ ] Durable documentation states that `createWorkspaceVueI18nPlugin()` is optional monorepo development tooling and that built consumers configure nothing.
- [ ] Durable documentation distinguishes production package precompilation from source-locale HMR.
- [ ] No stale requirement says omitting the preset must fail build/precompilation verification.
- [ ] Automated tests prove caller options are snapshotted and later mutation cannot change the provided snapshot.
- [ ] Automated tests prove component override selection preserves locale/component boundaries and partial sibling behavior at the selection seam.
- [ ] Host fallback and defaults-before-overrides are covered by a real component test only if a correct existing seam is available; otherwise documentation names the manual/source-edit verification.
- [ ] Relevant test, typecheck, and build commands pass.
- [ ] Dashboard no longer renders `PrototypeCard`; navigating through Demo > Internationalization opens a closable `Internationalization` tab containing the locale demonstration.
- [ ] The routed demonstration responds to the host locale preference and retains locale JSON HMR without document reload.

## Out of Scope

- Restoring URL-driven demo verification modes.
- Making override source files hot-reloadable.
- Adding a new browser-testing dependency solely for the prototype package.
- Supporting Node versions below the repository's `.node-version` requirement.
- Adding reload-driven controls or query modes to the new route.
