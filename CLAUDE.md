<!-- TRELLIS:START -->

# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:

- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

## Code Authoring Rules

Apply these rules to every code change:

1. **Document every method.** Each method needs a comment explaining why it exists, its responsibility, every input parameter, and its return value. Keep the comment adjacent to the method and update it when the signature or behavior changes. Note that this applies not just to functions/methods, depending on the languages, this also applies to class fields, global variables, component states etc..
2. **Read before writing.** Before changing code, read the relevant implementation and its callers. State the business logic the change captures and why the change is necessary before writing code.
3. **Make minimal changes.** Reuse established logic and conventions. Avoid broad rewrites, speculative abstractions, and cleverness that obscures maintenance.
4. **Follow language standards.** Use the language and project formatting/conventions, keep methods focused, and apply design patterns only when they make control flow and ownership clearer.

## Subagent Orchestration

1. Don't just spawn a lone subagent. If only one is necessary, just do it with the default agent.

2. Don't give entire file/feature to subagents to implement. Design the overall architecture or, depending on the scale, API surface and/or structure of the code with the main agent, then delegate the details to subagents.

3. Only give scoped tasks to subagents. Avoid potentially open-ended tasks that can leave subagent running for a long time.

## Agent skills

### Issue tracker

Issues are tracked in this repository’s GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the five default canonical labels. See `docs/agents/triage-labels.md`.

### Domain docs

Domain documentation uses a multi-context layout. See `docs/agents/domain.md`.

<!-- OPENWIKI:START -->

## OpenWiki

This repository has a generated `openwiki/` evidence index. It is optional just-in-time context, not required startup reading.

- Treat source code and tests as authoritative. A brief's unknowns and review items are verification gaps, not automatic requirements.
- Prefer the narrowest quiet validation that proves the changed behavior. Preserve complete failure output.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
