# Files

- [@noob-naive-ui/i18n](i18n.md) - Shared library i18n foundation — I18nText values, the per-component Composer registry that resolves overrides from the framework-wide libraryId-keyed registry, and one-way global locale sync used by every other package.
- [@noob-naive-ui/prototype-i18n-verification](prototype-i18n-verification.md) - The standalone i18n verification package — a localized PrototypeCard component and its own plugin, used by the demo to prove the component-local Composer override contract.
- [@noob-naive-ui/registry](registry.md) - The framework-wide, libraryId-keyed override registry shared by every component package — the unified schema for per-library i18n and themeVar override types, the single injection key, and the module-augmentation seam packages use to declare their full locale and theme schemas.
- [@noob-naive-ui/ui](ui.md) - The ui package — the per-library config provider, the useUiTheme composable and typed component-first themeVar schema (UiCard), and the i18n key with an empty locale schema; hosts override its slice through the shared registry.

# Directories

- [admin-vue-router](admin-vue-router/)
- [admin](admin/)
