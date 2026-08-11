import { createI18n } from "vue-i18n";

/**
 * The demo's single Composition API global Vue I18n instance.
 *
 * The host owns the active locale (seeded by the `AdminProvider` component
 * from the hydrated preference store), the fallback locale, and the demo's
 * own app-level messages. Messages are seeded into this global Composer by
 * the `AdminProvider` component at setup time (not at app setup), so
 * locale-resource edits HMR via the provider's component self-accept
 * boundary instead of a plain-module full reload. AdminShell owns all later
 * store → Composer synchronization; non-component modules (menu, tab labels)
 * translate through `i18n.global.t` after the provider has mounted.
 */
export const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
});
