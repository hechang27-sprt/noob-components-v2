## Parent

#1

## What to build

Propagate user logout and eviction across open tabs through a dedicated, versioned LocalStorage invalidation event containing a unique event identity and the same tagged anonymous cause. Passive tabs treat the event as untrusted input, deduplicate it, invalidate pending auth operations, clear both durable and tab-local presentation identity, and reuse the common anonymous transition.

Only the initiating tab invokes host cleanup and broadcasts. Passive tabs neither invoke host logout, rebroadcast, nor rerun host restoration. The mechanism must evict mixed LocalStorage/SessionStorage tabs and prevent a pending restore or login in another tab from re-authenticating after invalidation.

## Acceptance criteria

- [ ] Initiating user logout and eviction write a valid versioned invalidation event with a unique ID and tagged cause.
- [ ] Identity persistence and invalidation events use separate records beneath the host namespace.
- [ ] Passive tabs validate storage area, configured key, JSON shape, version, event kind, unique ID, and cause before transitioning.
- [ ] Malformed, stale-version, unrelated-key, and already-processed events do not mutate Authentication state.
- [ ] A valid event clears both LocalStorage and the passive tab's SessionStorage identity and preserves the propagated cause.
- [ ] Passive invalidation advances operation ownership so older login, restore, or retry completions cannot re-authenticate.
- [ ] Passive tabs do not invoke the host logout callback and do not rebroadcast the event.
- [ ] Passive tabs do not rerun host restoration as their eviction mechanism.
- [ ] SessionStorage-only and mixed-tier tabs are evicted even when the durable identity key is already absent.
- [ ] LocalStorage identity writes never authenticate another tab.
- [ ] Two independent public-store instances with controlled storage transport prove callback counts, deduplication, mixed tiers, repeated unique events, and pending-operation races.

## Blocked by

- #5
