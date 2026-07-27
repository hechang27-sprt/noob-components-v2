## Parent

#1

## What to build

Represent a thrown host restoration failure as unavailable rather than anonymous or authenticated. Valid cached presentation identity remains available for a later retry but is never trusted for protected access. The public login route replaces credential entry with accessible Retry and Sign out actions while unavailable.

Retry is owned by the auth runtime, deduplicates concurrent attempts, returns to loading, and commits only the current restoration result. A successful retry uses the router runtime's existing validated redirect restoration and home fallback; repeated failure remains recoverable without exposing raw host errors.

## Acceptance criteria

- [ ] A thrown restore error settles loading as unavailable and never authenticates from cached identity.
- [ ] Valid cached presentation identity and its tier survive unavailable restoration for retry.
- [ ] Protected navigation routes to login recovery through validated redirect handling.
- [ ] The login route shows accessible Retry and Sign out controls instead of credentials while unavailable.
- [ ] Retry starts one current restoration operation and duplicate concurrent retry requests are deduplicated.
- [ ] Retry success establishes fresh identity and restores the validated original destination or home fallback.
- [ ] Retry failure returns to unavailable without leaking raw host errors.
- [ ] Sign out from recovery clears cached presentation identity through user-requested logout.
- [ ] Guard readiness cannot wait forever when retry supersedes an earlier restoration operation.
- [ ] Store, router integration, and component tests cover observable recovery, redirects, safe feedback, pending controls, and accessibility.

## Blocked by

- #2
- #3
