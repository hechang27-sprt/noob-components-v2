## Parent

#1

## What to build

Persist only Authentication presentation identity, never credentials or session authority, using the user's Remember Me choice. Remembered login uses durable LocalStorage; non-remembered login uses tab-scoped SessionStorage; successful cold restoration defaults to SessionStorage; and later restoration preserves the existing tier while refreshing stale presentation fields.

The host supplies a stable namespace. Versioned browser records are treated as untrusted input at one normalization boundary. Missing, malformed, obsolete, blocked, or throwing storage must not crash startup or establish authentication. Host restoration remains authoritative in every case.

## Acceptance criteria

- [ ] Remembered login stores only presentation identity in LocalStorage and removes any SessionStorage identity for the namespace.
- [ ] Non-remembered login stores only presentation identity in SessionStorage and removes any LocalStorage identity for the namespace.
- [ ] Successful cold restoration without an existing tier caches fresh identity in SessionStorage.
- [ ] Successful restoration refreshes identity in the existing valid tier.
- [ ] A required host namespace prevents unrelated Admin applications on one origin from sharing records accidentally.
- [ ] Versioned identity records are validated before state consumes them.
- [ ] Malformed and obsolete records never establish authentication and are safely ignored or removed.
- [ ] Blocked or throwing storage degrades to in-memory Authentication state and host restoration.
- [ ] A manually written LocalStorage identity cannot authenticate a tab without a successful host effect.
- [ ] Public-store tests cover both tiers, fresh identity replacement, malformed data, throwing adapters, and non-authoritative storage.

## Blocked by

- #2
