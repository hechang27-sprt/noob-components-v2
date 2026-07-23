# Remediate main-to-HEAD review findings

## Goal
Resolve the source-code, behavioral-test, and persistent-documentation findings recorded in `.trellis/tasks/07-23-review-main-head/review.md`, without modifying archived task artifacts.

## Requirements
- Keep a closing tab when host-confirmed navigation still reports that tab active; remove it only after confirmation of a different active tab or `null`.
- Route demo login/logout home replacement through `AdminShellNavigation.handleNavigation` using a fresh Dashboard descriptor and `closeCurrent: true`.
- Ensure the Vue Router registry recognizes own definition keys only.
- Cache only generated fallback page identity and rebuild descriptors from every current decoded destination.
- Restore observable AdminShell tests for rejected logout recovery, host-owned menu selection, rejected/duplicate activate and close requests, and navigation-adapter replacement invalidating stale work.
- Update persistent non-archived documentation that describes superseded navigation ownership or confirmation semantics.
- Do not edit `.trellis/tasks/archive/**`.

## Acceptance criteria
- Focused package tests cover all corrected branches and pass.
- Admin, admin-vue-router, and demo typechecks/builds pass.
- Demo browser smoke verifies login, navigation, logout/login identity reset, and no console errors.
- Persistent docs describe scalar menu keys, host-authoritative descriptors, and successful-navigation confirmation accurately.
