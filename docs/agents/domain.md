# Domain Docs

How engineering skills should consume this repository’s domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repository root. It points to one `CONTEXT.md` per relevant context.
- **`docs/adr/`** for system-wide decisions.
- Context-scoped ADR directories identified by `CONTEXT-MAP.md`, such as `packages/<context>/docs/adr/` or `apps/<context>/docs/adr/`.

If any file does not exist, proceed silently. Domain-modeling skills create these documents lazily when terms or decisions are resolved.

## File structure

This repository uses a multi-context layout:

```text
/
├── CONTEXT-MAP.md
├── docs/adr/                         ← system-wide decisions
├── packages/
│   └── <context>/
│       ├── CONTEXT.md
│       └── docs/adr/                 ← package-scoped decisions
└── apps/
    └── <context>/
        ├── CONTEXT.md
        └── docs/adr/                 ← application-scoped decisions
```

## Use the glossary’s vocabulary

When output names a domain concept—in an issue title, refactor proposal, hypothesis, or test name—use the term defined in the relevant `CONTEXT.md`. Do not drift to synonyms the glossary explicitly avoids.

If a needed concept is absent, reconsider whether the term belongs to the project or note the gap for domain modeling.

## Flag ADR conflicts

If output contradicts an existing ADR, surface the conflict explicitly rather than silently overriding it:

> _Contradicts ADR-0007 — but worth reopening because…_
