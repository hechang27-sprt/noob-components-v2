# Implementation plan

1. Add focused failing tests for close confirmation, inherited registry keys, refreshed fallback descriptors, demo auth replacement, and restored AdminShell async/boundary contracts.
2. Fix AdminShell close membership and Vue Router registry/fallback caching.
3. Replace demo auth route writes with adapter requests using fresh Dashboard candidates.
4. Run focused tests and package typechecks/builds; fix regressions.
5. Browser-smoke the demo flows and inspect console/network behavior.
6. Update persistent docs and applicable Trellis spec contracts, then run full lint/format checks.

## Rollback points
- Shell close change is isolated to membership confirmation.
- Adapter changes preserve public signatures and can be independently reverted.
- Demo auth integration is isolated to login/logout callbacks.
