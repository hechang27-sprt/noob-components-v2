# PRD: Single i18n override registry across component packages

**Date**: 2026-08-13
**Package**: i18n, admin, ui
**Status**: Draft → Approved

## Problem

Each component package owns a **per-package override injection key**
(`adminI18nOverridesKey`; ui would need `noobUiI18nOverridesKey`). AdminProvider
provides only the admin snapshot under its key. To supply text overrides for the
ui package (or any future package) a host would need a second provider
(`UiProvider`) — non-ergonomic and a parallel of the per-package plugin
transport we just removed.

## Goal

Replace the per-package override transport with **one shared override registry
keyed by `libraryId`**, provided once by AdminProvider, consumed by every
component package through `createComponentI18n`. Hosts then supply ui + admin
(and future package) text overrides through a single channel — no `UiProvider`.

## Design summary

- `packages/i18n` exports `libraryI18nOverridesKey: InjectionKey<LibraryI18nOverridesRegistry>` (ONE symbol for all packages) and `LibraryI18nOverridesRegistry = { [libraryId]: { messages: unknown } }`.
- `LibraryI18nDescriptor` **drops `overridesKey`**; keeps `libraryId`, `emptySnapshot`, `selectComponentOverrides`.
- `createComponentI18n(descriptor)` injects the registry, resolves `registry[descriptor.libraryId] ?? descriptor.emptySnapshot`, then `descriptor.selectComponentOverrides(...)`.
- AdminProvider's `overrides` prop becomes the registry `{ admin?: ..., ui?: ... }`; it provides the whole registry under the shared key with per-entry `structuredClone` (defensive copy). No admin→ui import coupling (registry loosely typed at the prop; hosts type each entry by importing that package's override type).
- Remove vestigial `adminI18nOverridesKey` / `DEFAULT_SNAPSHOT` exports from admin. Keep `AdminI18nSnapshot` (typed alias hosts use).
- `noobUiI18n` (ui) becomes genuinely usable through the same channel.

## Non-goals

- Migrating `packages/prototype-i18n-verification` — self-contained harness, doesn't import `@noob-naive-ui/i18n` or admin; its own key/plugin stays.
- Reintroducing any `app.use(plugin)` transport.
- The pre-existing theme test failures (fontSize / "Large" dropdown).

## Acceptance criteria

- One `libraryI18nOverridesKey` + `LibraryI18nOverridesRegistry` in packages/i18n; descriptor has no `overridesKey`.
- `createComponentI18n` resolves overrides from the registry by `descriptor.libraryId`.
- AdminProvider provides the full registry from its `overrides` prop; admin + ui overrides flow through it with no extra provider.
- `adminI18nOverridesKey` / `DEFAULT_SNAPSHOT` removed from admin public API; tests/spec updated.
- i18n + admin tests pass (2 pre-existing theme failures excluded), typecheck/build/lint/format clean.
