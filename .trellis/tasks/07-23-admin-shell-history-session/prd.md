# Scope AdminShell history to an auth session

## Goal
Prevent browser-history entries created during an earlier authenticated session from restoring their page route or AdminShell tab identity after logout and a later login.

## Requirements
- Treat authentication/authorization as host-owned route authority; history metadata must never grant access.
- Associate adapter-owned history metadata with one transient authenticated navigation scope.
- A history entry from another scope must not restore its tab ID, label, closability, or destination as the active application page.
- Back/forward traversal to an expired entry must replace that entry with a safe host-selected destination in the current scope.
- Anonymous traversal to protected routes must replace with the login route.
- Preserve normal back/forward behavior among entries created in the current authenticated scope.
- Keep `@noob-naive-ui/admin` router-, session-, and auth-policy-neutral.
- Do not attempt unsupported arbitrary deletion of browser history entries.

## Acceptance criteria
- Logout followed by login and browser Back cannot render a route from the prior authenticated scope.
- An expired entry encountered via Back/Forward is replaced rather than pushed, so traversal does not loop.
- Current-scope entries retain stable page-instance identity and canonical destination reconstruction.
- Direct URL entry and reload remain governed by host auth/route policy.
- Memory-history tests cover current, missing, and mismatched scope metadata plus repeated Back/Forward traversal.
