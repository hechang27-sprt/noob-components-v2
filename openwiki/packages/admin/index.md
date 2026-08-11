# Files

- [Admin Authentication — Auth Store and Login Page](auth.md) - The admin package's frontend-only authentication state machine, host-effect configuration, restoration readiness, and the AdminLoginPage presentation that renders it.
- [Admin i18n — Plugin, Locale Typing, and Resources](i18n.md) - How the admin package pins the shared library i18n plugin to its component-first locale schema, and how hosts override AdminShell and AdminLoginPage messages.
- [@noob-naive-ui/admin](overview.md) - The router-neutral Admin package — public barrel, runtime contracts, stores, shell components, naive-ui configuration, and i18n wiring that hosts configure and AdminShell consumes.
- [Admin Shell Preferences and Naive UI Configuration](preferences.md) - The persisted local display preferences store (theme mode, font size, locale, sidebar), its localStorage schema and hydration, and the derived NConfigProvider/ProLayout props.
- [Admin Navigation and Menu Runtime Stores](runtime-stores.md) - The configure-once Pinia stores holding the non-serializable router-neutral navigation controller and the host-supplied menu tree, and how admin-vue-router binds into them.
- [Admin Shell — Layout and Page-Instance State Machine](shell.md) - AdminShell's ProLayout composition, the router-neutral tab state machine (open/activate/close/heal), the tabbar and navbar controls, and the descendant context contract.
