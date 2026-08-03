# Review i18n layout changes and update docs

## Goal

Review the complete current Jujutsu working change (`@` versus `@-`) for correctness and standards compliance after the workspace Vue I18n helper and prototype locale-resource layout were revised, then reconcile durable documentation with the accepted current implementation.

## Confirmed Scope

- Review all files currently changed in `@`, including the locale layout, component imports, shared Vite preset, demo integration changes, and any interaction among them.
- Treat `@-` as the fixed review baseline and the current task artifacts as review bookkeeping rather than authored product changes.
- Validate the new flat, component-owned locale convention: one `src/locales/<ComponentName>.json` file containing all supported locale keys.
- Validate `createWorkspaceVueI18nPlugin()` against the repository's supported runtime/toolchain and its no-build source-consumer/HMR contract.
- Update only durable current-truth documentation. Remove or replace stale claims; do not retain the superseded directory convention as history.
- Report review findings separately from documentation edits. Do not silently fix product-code defects found during review.

## Acceptance Criteria

- [ ] Standards review covers every product-code hunk in `jj diff -r @` and cites exact files/lines for actionable findings.
- [ ] Contract review checks the flat locale shape, local Composer merge precedence, source-consumer precompilation, component-scoped HMR, and demo behavior against current specs.
- [ ] Demo and prototype package typechecks/builds pass, or failures are reported exactly.
- [ ] Applicable browser behavior is exercised if static/build checks cannot establish the HMR contract.
- [ ] `.trellis/spec/ui/frontend/library-i18n-contract.md` describes `src/locales/<ComponentName>.json` with all supported locales and the actual current HMR mechanism.
- [ ] No stale references to `src/locales/ComponentName/localeName.json` remain in durable documentation.
- [ ] Documentation does not preserve planning history or unimplemented future behavior.

## Out of Scope

- Automatically correcting product-code findings without separate user approval.
- Expanding the i18n public API or override model.
- Documenting historical layouts or future migration plans.
