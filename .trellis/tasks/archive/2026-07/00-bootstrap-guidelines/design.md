# Trellis Spec Bootstrap Design

## Scope

This task documents the rewrite workspace as it exists on 2026-07-10. It changes only Trellis task/spec documentation.

## Evidence hierarchy

1. Current package source and tests are the implementation authority.
2. `docs/agent/admin-runtime-contract.md` and `docs/agent/boundary-map.md` define ratified package boundaries where the next slice has not yet been implemented.
3. `tasks/plan.md` and `tasks/todo.md` identify implemented versus planned slices.

The specs must label unimplemented starter behavior as a constraint or planned ownership rule, never as an established code pattern.

## Final spec boundaries

- `ui/frontend/`: one package-boundary guide. The current package contains a narrow Naive theme bridge; it has no components, composables, tests, or backend runtime.
- `admin/frontend/`: three guides: public contract/package boundary, shell-preferences state and persistence, and TSX component/test conventions.
- `admin-starter/frontend/`: one current-state and ownership guide. The app is intentionally not scaffolded beyond its stub manifest; the guide protects the starter/runtime boundary for Tasks 8–9.
- `guides/`: two project-specific thinking guides for package ownership/reuse and package-storage-runtime boundaries. Trellis-CLI, Python, event-log, runtime-template, and versioned-documentation boilerplate is removed because this workspace has none of those layers.
- Backend template directories are removed for `ui` and `admin`: neither package has backend source, and `@noob-naive-ui/admin` is explicitly frontend-only.
- Generic template topic files without a project pattern are removed.

## Invariants

- `@noob-naive-ui/ui` is a value-add layer and must not become a broad Naive UI re-export or wrapper-parity package.
- `@noob-naive-ui/admin` consumes frontend-ready types and callbacks only; backend DTOs, session models, routes, transport clients, and permission payloads remain outside it.
- Shell preferences are runtime-local state with Zod normalization and a storage adapter; only the documented persistent subset reaches storage.
- Admin components use Vue setup-function `defineComponent` with TSX, direct Naive UI imports, Tailwind utility classes, and accessibility semantics verified through DOM behavior.
- The starter owns app assembly, route registry, backend integration, and derivation of frontend-ready admin inputs once scaffolded.

## Risks controlled

- Template files could make agents invent unsupported hooks, state layers, or backend conventions. Remove them rather than filling them with generic advice.
- Foreign Trellis-product guides would direct agents toward nonexistent Python/CLI/template layers. Replace them with current workspace ownership and data-flow checks.
- The starter has no source. State that fact and cite ratified task/doc constraints, rather than claiming a nonexistent pattern.
- The old library audit describes a migration source, not target implementation. Use it only for migration boundaries, not as a target-code convention.
