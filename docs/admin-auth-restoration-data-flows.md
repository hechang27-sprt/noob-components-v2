# Admin Authentication Restoration Data Flows

## Purpose

This document demonstrates the planned data flow for login, restoration, logout, eviction, recovery, and cross-tab coordination. It complements [the authentication-restoration grilling notes](./admin-auth-restoration-grilling.md).

The design is not yet implemented.

## Ownership boundary

```mermaid
flowchart LR
    UI[AdminLoginPage / AdminShell]
    Auth[Admin auth store]
    Router[Admin Vue Router]
    SS[SessionStorage]
    LS[LocalStorage]
    Host[Host auth effects]
    Authority[Cookie / token / auth SDK / backend]

    UI --> Auth
    Router --> Auth
    Auth --> SS
    Auth --> LS
    Auth --> Host
    Host --> Authority
```

- The host owns credentials, backend sessions, authentication SDK state, and login/restore/logout effects.
- The Admin package stores only presentation identity: `userLabel`, `avatarUrl`, and `subtitle`.
- Browser storage never establishes authentication. Only a current successful host `login()` or `restore()` result may transition to `authenticated`.
- Every auth operation captures a monotonically increasing generation. Only the latest generation may commit state.

## Authentication states and causes

```ts
type AdminEvictionReason = "expired" | "forbidden" | "unknown";

type AdminAnonymousCause =
  | { kind: "unauthenticated" }
  | { kind: "user-requested" }
  | { kind: "evicted"; evictionReason: AdminEvictionReason };

type AdminAuthStatus =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "anonymous"; cause: AdminAnonymousCause }
  | ({ kind: "authenticated" } & AdminAuthIdentity);
```

The types illustrate the settled model; exact exported declarations remain an implementation decision.

## Persistence records

The host supplies a stable namespace such as `acme-admin:auth`. The package owns versioned records beneath it.

```text
LocalStorage
├── acme-admin:auth:identity
│   └── { version, identity }
└── acme-admin:auth:event
    └── { version, id, kind: "logout", cause }

SessionStorage
└── acme-admin:auth:identity
    └── { version, identity }
```

Identity and coordination events are separate because removing an identity cannot reliably communicate an eviction cause or repeated logout.

## Login without Remember Me

`remember` is false or omitted.

```mermaid
sequenceDiagram
    participant User
    participant Login as AdminLoginPage
    participant Auth as Admin auth store
    participant Host as Host login effect
    participant SS as SessionStorage
    participant Router

    User->>Login: Submit credentials
    Login->>Auth: login(values, remember=false)
    Auth->>Auth: Start generation N
    Auth->>Host: config.login(values)
    Host-->>Auth: AdminAuthIdentity
    Auth->>Auth: Confirm generation N is current
    Auth->>SS: Write versioned identity
    Auth->>Auth: status = authenticated(identity)
    Auth-->>Router: Authentication transition
    Router->>Router: Restore validated redirect or home
```

Result:

- Presentation identity is tab-scoped in SessionStorage.
- Refresh in the same tab preserves the cache, but still requires host restoration.
- Another tab does not receive this identity.
- A host credential such as an HttpOnly cookie may nevertheless allow another tab to restore independently.

## Login with Remember Me

```mermaid
sequenceDiagram
    participant User
    participant Auth as Admin auth store
    participant Host as Host login effect
    participant SS as SessionStorage
    participant LS as LocalStorage
    participant Router

    User->>Auth: login(values, remember=true)
    Auth->>Auth: Start generation N
    Auth->>Host: config.login(values)
    Host-->>Auth: AdminAuthIdentity
    Auth->>Auth: Confirm generation N is current
    Auth->>SS: Remove session identity
    Auth->>LS: Write versioned identity
    Auth->>Auth: status = authenticated(identity)
    Auth-->>Router: Authentication transition
    Router->>Router: Restore validated redirect or home
```

The LocalStorage identity survives browser restarts and is visible to same-origin tabs. Its presence still does not authenticate any tab; every tab calls host restoration.

## Refresh with SessionStorage identity

```mermaid
sequenceDiagram
    participant App
    participant Auth as Admin auth store
    participant SS as SessionStorage
    participant Host as Host restore effect
    participant Router

    App->>Auth: configure(config)
    Auth->>Auth: status = loading
    Auth->>SS: Read and validate identity record
    Auth->>Host: config.restore()
    Router->>Auth: whenReady()
    Host-->>Auth: authenticated(fresh identity)
    Auth->>Auth: Confirm restore generation is current
    Auth->>SS: Replace identity cache
    Auth->>Auth: status = authenticated(fresh identity)
    Auth-->>Router: Ready
    Router->>Router: Continue protected navigation
```

The cache preserves presentation data and the session persistence tier. It does not bypass validation.

## Refresh with LocalStorage identity

```mermaid
sequenceDiagram
    participant App
    participant Auth as Admin auth store
    participant LS as LocalStorage
    participant Host as Host restore effect
    participant Router

    App->>Auth: configure(config)
    Auth->>Auth: status = loading
    Auth->>LS: Read and validate identity record
    Auth->>Host: config.restore()
    Router->>Auth: whenReady()
    Host-->>Auth: authenticated(fresh identity)
    Auth->>Auth: Confirm restore generation is current
    Auth->>LS: Replace identity cache, preserving durable tier
    Auth->>Auth: status = authenticated(fresh identity)
    Auth-->>Router: Ready
    Router->>Router: Continue protected navigation
```

SessionStorage and LocalStorage restoration differ only in cache lifetime. Host validation remains authoritative in both cases.

## Cold restoration through an HttpOnly cookie

Restoration runs even when no identity is cached because JavaScript cannot inspect an HttpOnly session cookie.

```mermaid
sequenceDiagram
    participant App
    participant Auth as Admin auth store
    participant Storage
    participant Host as Host restore effect
    participant Server
    participant Router

    App->>Auth: configure(config)
    Auth->>Auth: status = loading
    Auth->>Storage: No cached identity
    Auth->>Host: config.restore()
    Host->>Server: GET /session
    Note over Host,Server: Browser attaches HttpOnly cookie
    Server-->>Host: Valid session + fresh identity
    Host-->>Auth: authenticated(identity)
    Auth->>Storage: Cache identity in SessionStorage
    Auth->>Auth: status = authenticated(identity)
    Auth-->>Router: Ready
```

A missing package cache means only that no presentation identity is cached. It does not prove that the host session is absent.

## Cold start without a valid host session

```mermaid
sequenceDiagram
    participant App
    participant Auth as Admin auth store
    participant Host as Host restore effect
    participant Router

    App->>Auth: configure(config)
    Auth->>Auth: status = loading
    Auth->>Host: config.restore()
    Host-->>Auth: anonymous({ kind: "unauthenticated" })
    Auth->>Auth: Clear stale identity records
    Auth->>Auth: status = anonymous(unauthenticated)
    Auth-->>Router: Ready
    Router->>Router: Route to login
```

This is ordinary anonymity, not eviction or restoration failure.

## User-requested logout

```mermaid
sequenceDiagram
    participant User
    participant Auth as Admin auth store
    participant SS as SessionStorage
    participant LS as LocalStorage
    participant Event as LocalStorage event record
    participant Host as Host logout effect
    participant Router

    User->>Auth: logout({ kind: "user-requested" })
    Auth->>Auth: Advance generation
    Auth->>SS: Remove session identity
    Auth->>LS: Remove durable identity
    Auth->>Event: Write unique logout event + cause
    Auth->>Auth: status = anonymous(user-requested)
    Auth-->>Router: Redirect to login
    Auth->>Host: config.logout(cause)
    Host-->>Auth: Resolve or reject
```

Local eviction occurs before host cleanup. Host callback rejection rejects `logout()` to its caller but never restores cached identity or authenticated state.

## SessionStorage-backed eviction

An API request discovers an expired host session while the presentation identity is tab-scoped.

```mermaid
sequenceDiagram
    participant API as Host API layer
    participant Auth as Admin auth store
    participant SS as SessionStorage
    participant Event as LocalStorage event record
    participant Host as Host logout effect
    participant Router

    API->>Auth: logout(evicted/expired)
    Auth->>Auth: Advance generation
    Auth->>SS: Remove session identity
    Auth->>Event: Write durable logout event
    Auth->>Auth: status = anonymous(evicted/expired)
    Auth-->>Router: Redirect to login
    Auth->>Host: config.logout(cause)
```

LocalStorage remains the cross-tab coordination channel even when the initiating tab used SessionStorage for its identity.

## LocalStorage-backed eviction

```mermaid
sequenceDiagram
    participant API as Host API layer
    participant Auth as Admin auth store
    participant LS as LocalStorage identity
    participant Event as LocalStorage event record
    participant Host as Host logout effect
    participant Router

    API->>Auth: logout(evicted/forbidden)
    Auth->>Auth: Advance generation
    Auth->>LS: Remove durable identity
    Auth->>Event: Write unique logout event + cause
    Auth->>Auth: status = anonymous(evicted/forbidden)
    Auth-->>Router: Redirect to login
    Auth->>Host: config.logout(cause)
```

No arbitrary eviction parameter bag crosses the package boundary. New reason-specific data requires a concrete frontend use case and typed contract.

## Cross-tab LocalStorage eviction

Assume Tab A and Tab B share one persistence namespace and both currently present the same remembered identity.

### Initial state

```text
LocalStorage
├── acme-admin:auth:identity
│   └── { version: 1, identity: { userLabel: "Alice" } }
└── acme-admin:auth:event
    └── absent

Tab A: authenticated(Alice), generation 7
Tab B: authenticated(Alice), generation 4
```

### Complete flow

```mermaid
sequenceDiagram
    participant APIA as Tab A API layer
    participant AuthA as Tab A auth store
    participant RouterA as Tab A router
    participant LS as LocalStorage
    participant AuthB as Tab B auth store
    participant RouterB as Tab B router
    participant HostA as Tab A host logout effect

    APIA->>APIA: Receive expired-session response
    APIA->>AuthA: logout(evicted/expired)

    AuthA->>AuthA: Advance generation 7 to 8
    AuthA->>LS: Remove identity record
    AuthA->>LS: Write unique logout event
    AuthA->>AuthA: status = anonymous(evicted/expired)
    AuthA-->>RouterA: Auth transition
    RouterA->>RouterA: Redirect to login

    LS-->>AuthB: Browser storage event
    AuthB->>AuthB: Parse and validate event
    AuthB->>AuthB: Verify namespace and unseen event ID
    AuthB->>AuthB: Advance generation 4 to 5
    AuthB->>LS: Ensure durable identity is absent
    AuthB->>AuthB: Clear tab-local SessionStorage identity
    AuthB->>AuthB: status = anonymous(evicted/expired)
    AuthB-->>RouterB: Auth transition
    RouterB->>RouterB: Redirect to login

    AuthA->>HostA: config.logout(evicted/expired)
    HostA-->>AuthA: Resolve or reject

    Note over AuthB: Tab B does not call its host logout effect
```

### Event record

Conceptually, Tab A writes:

```ts
localStorage.setItem(
  `${namespace}:auth-event`,
  JSON.stringify({
    version: 1,
    id: crypto.randomUUID(),
    kind: "logout",
    cause: {
      kind: "evicted",
      evictionReason: "expired",
    },
  }),
);
```

The unique event ID ensures that repeated logout operations produce distinct storage events and lets receivers deduplicate already-processed events.

### Passive-tab event handling

```mermaid
flowchart TD
    A[Storage event received] --> B{Configured LocalStorage event key?}
    B -- No --> X[Ignore]
    B -- Yes --> C{Valid versioned logout event?}
    C -- No --> X
    C -- Yes --> D{Event ID already processed?}
    D -- Yes --> X
    D -- No --> E[Advance operation generation]
    E --> F[Clear LocalStorage and tab SessionStorage identity]
    F --> G[Set anonymous with propagated cause]
    G --> H[Router redirects to login]
```

LocalStorage is untrusted input. A receiver validates the storage area, configured key, JSON schema, version, event kind, cause, and event ID before changing state.

Tab B performs only local eviction. It does not invoke its host logout callback because doing so would duplicate backend revocation, SDK side effects, telemetry, and callback failures across every open tab.

### Shared transition, dedicated transport

Cross-tab eviction is not a separate authentication-state algorithm. User logout, direct host eviction, authoritative anonymous restoration, and passive cross-tab invalidation all enter one internal transition:

```mermaid
flowchart TD
    A[User logout] --> T[Transition to anonymous]
    B[Direct host eviction] --> T
    C[Restore returns anonymous] --> T
    D[Validated cross-tab event] --> T
    T --> G[Advance generation]
    G --> P[Clear identity persistence]
    P --> S[Set anonymous with cause]
```

The dedicated LocalStorage mechanism owns only cross-tab delivery, schema validation, event deduplication, and prevention of rebroadcast loops. A passive tab does not invoke the host logout callback.

### Why identity removal does not trigger restoration

The rejected simplification was to remove the LocalStorage identity, let Tab B observe that removal, and make Tab B rerun host `restore()`. That is unsafe as the general eviction mechanism:

- User logout clears package state before host cleanup. Tab B can restore while the cookie session is still valid and re-authenticate itself.
- A `forbidden` eviction may remove access to the Admin application without invalidating the underlying host session. Restoration can correctly return authenticated while application policy requires eviction.
- Removing an already-absent LocalStorage identity may emit no event, and SessionStorage-only identities provide no shared identity key to remove.
- Identity removal carries no tagged Anonymous cause and cannot distinguish logout, expiration, forbidden access, storage cleanup, or migration.
- Offline or failed restoration produces `unavailable` rather than the authoritative eviction already known by Tab A.
- Every open tab would perform avoidable host restoration, token refresh, or SDK initialization work.

The settled design therefore keeps a dedicated versioned invalidation event while sharing the underlying anonymous transition. LocalStorage events may reduce access; identity changes never establish authentication.

### Pending restoration in the passive tab

```mermaid
sequenceDiagram
    participant AuthB as Tab B auth store
    participant HostB as Tab B host restore
    participant LS as LocalStorage

    AuthB->>HostB: restore(), generation 4
    LS-->>AuthB: Logout event from Tab A
    AuthB->>AuthB: Advance to generation 5
    AuthB->>AuthB: status = anonymous(evicted/expired)
    HostB-->>AuthB: authenticated(Alice), generation 4
    AuthB->>AuthB: Ignore stale generation 4 completion
```

Advancing the generation prevents an older login, restore, or retry completion from re-authenticating the passive tab after eviction.

### Initiating callback failure

If Tab A's host logout callback rejects:

- Tab A remains anonymous.
- Tab B remains anonymous.
- The shared durable identity remains absent.
- Pending auth operations remain invalidated.
- Tab A's action promise rejects so its caller can observe cleanup failure.
- Tab B does not receive or reproduce the callback failure.

### Mixed persistence tiers

If Tab A uses LocalStorage while Tab B uses SessionStorage, Tab B still receives the LocalStorage logout event and clears its own tab-local identity. The event channel is durable and cross-tab even when a receiving identity is not.

## Authoritative restoration eviction

A cached identity exists, but the host reports that the session has expired.

```mermaid
sequenceDiagram
    participant Auth as Admin auth store
    participant Storage
    participant Host as Host restore effect
    participant Router

    Auth->>Auth: status = loading
    Auth->>Storage: Read cached identity
    Auth->>Host: config.restore()
    Host-->>Auth: anonymous(evicted/expired)
    Auth->>Storage: Remove cached identity
    Auth->>Auth: status = anonymous(evicted/expired)
    Auth-->>Router: Ready, access denied
    Router->>Router: Route to login with validated redirect
```

An explicit anonymous restore result is authoritative and clears the cache.

## Restoration unavailable

A timeout, offline browser, or authentication SDK failure does not prove that the host session is invalid.

```mermaid
sequenceDiagram
    participant Auth as Admin auth store
    participant Storage
    participant Host as Host restore effect
    participant Router
    participant Login as Login recovery UI

    Auth->>Auth: status = loading
    Auth->>Storage: Read cached identity
    Auth->>Host: config.restore()
    Host--xAuth: Throw transport or SDK error
    Auth->>Auth: status = unavailable
    Note over Storage: Preserve cache but do not trust it
    Auth-->>Router: Readiness settles as unavailable
    Router->>Login: Route through validated redirect flow
    Login->>Login: Show Retry and Sign out
```

Retry starts a new generation and invokes host restoration again. Success authenticates with a fresh identity and restores the validated original destination. Sign out clears the preserved cache with `{ kind: "user-requested" }`.

## Logout while restoration is pending

```mermaid
sequenceDiagram
    participant Auth as Admin auth store
    participant Host as Host restore effect

    Auth->>Host: restore(), generation 10
    Auth->>Auth: logout(cause), advance to generation 11
    Auth->>Auth: Clear storage and become anonymous
    Host-->>Auth: authenticated(identity), generation 10
    Auth->>Auth: Ignore stale generation 10 completion
```

The same latest-generation rule applies to login, restore, retry, user logout, direct eviction, and passive cross-tab eviction.

## State transitions

```mermaid
stateDiagram-v2
    [*] --> Loading: configure
    Loading --> Authenticated: restore authenticated
    Loading --> Anonymous: restore anonymous
    Loading --> Unavailable: restore throws

    Anonymous --> Authenticated: login succeeds
    Anonymous --> Anonymous: logout or passive eviction

    Authenticated --> Anonymous: logout(cause)
    Authenticated --> Loading: explicit restoration

    Unavailable --> Loading: retryRestore
    Unavailable --> Anonymous: user-requested logout

    Loading --> Anonymous: newer logout or eviction wins
```

## Invariant

> Browser storage may preserve presentation identity and persistence intent, but only a current host effect may establish `authenticated`. Any newer logout or eviction immediately invalidates older pending operations.

A LocalStorage event may reduce access by evicting a tab. A LocalStorage identity write may never grant access or authenticate another tab.
