# Files

- [Admin Navigation Runtime — Vue Router Adapter](navigation-runtime.md) - The router-bound controller behind AdminShell: persisted tab metadata in history state, open/activate/close/heal semantics, the history-scope guard, and explicit scope entry.
- [@noob-naive-ui/admin-vue-router](overview.md) - The admin router runtime — the only package that imports vue-router; it binds host route definitions to reversible destinations, adapts the shell's navigation controller, and owns auth and history-scope guards.
- [Admin Router Plugin — createAdminRouterPlugin](plugin.md) - The factory that owns the complete Vue Router instance, generated login/shell routes, auth and scope guards, auth-transition routing, and deterministic disposal.
- [Admin Route Registry and URL Codecs](route-registry.md) - How hosts bind navigation target keys to name-free route records and reversible Zod payload codecs, and how destinations convert to and from Vue Router state.
