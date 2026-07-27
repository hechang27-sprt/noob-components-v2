## Parent

#1

## What to build

Make user-requested logout and host-driven eviction immediately authoritative over package Authentication state. Anonymous state carries an explicit tagged cause: ordinary unauthenticated, user-requested, or evicted for expired, forbidden, or unknown reasons. Logout requires a cause, advances operation ownership, clears both persistence tiers, and closes protected access before invoking host cleanup.

Host cleanup rejection remains observable to the initiating caller but cannot restore authenticated UI or cached identity. A single internal anonymous transition is shared by logout, direct eviction, and authoritative anonymous restoration. Latest-operation ownership prevents older login, restore, or retry completions from undoing a newer logout or eviction.

## Acceptance criteria

- [ ] Anonymous state requires an explicit unauthenticated, user-requested, or evicted cause.
- [ ] Eviction initially supports expired, forbidden, and unknown reasons without an open parameter bag.
- [ ] Public logout requires a cause and passes it to the host callback.
- [ ] Logout advances operation ownership, clears LocalStorage and SessionStorage identity, and becomes anonymous before host cleanup completes.
- [ ] Host cleanup rejection rejects the initiating action but leaves local state and persistence anonymous and cleared.
- [ ] Authoritative anonymous restoration clears stale presentation identity.
- [ ] A forbidden eviction closes Admin access even when the broader host session may remain valid.
- [ ] Older pending login, restore, and retry completions cannot re-authenticate after newer logout or eviction.
- [ ] Components and router behavior exhaustively handle the tagged causes without exposing raw host errors.
- [ ] The demo and all public consumers use the cause-aware contract with no parameterless compatibility alias.
- [ ] Behavioral tests use deferred host effects to prove local-first ordering and stale-completion suppression.

## Blocked by

- #2
- #3
