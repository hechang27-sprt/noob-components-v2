# Design

## Boundaries
- `AdminShell` remains host-authoritative: resolved navigation results determine membership changes.
- `admin-vue-router` snapshots registry entries into an own-key `Map`; prototype-chain properties never participate.
- Fallback caching stores only page-instance IDs keyed by history position/fullPath. Presentation and canonical destination are recomputed from current route authority.
- Demo auth transitions use the existing adapter as the sole route/history writer.

## Data flow
1. Login/logout creates a fresh Dashboard descriptor via the demo presentation policy.
2. It sends an `open` request with `closeCurrent: true`; adapter replaces current history state with fresh tab metadata.
3. Auth state changes only after navigation resolves.
4. Close completion removes shell membership iff returned `active?.id` differs from the closing ID.

## Compatibility
No public type changes. Registry behavior is tightened for unsafe inherited keys. Fallback descriptors retain stable IDs while reflecting refreshed codec payload and presentation.

## Documentation
Update only persistent non-archived docs/research. Archived task records are explicitly out of scope.
