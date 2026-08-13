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
  // Both warn flags must be off on the root composer: component local
  // composers (createComponentI18n) inherit missingWarn/fallbackWarn FROM
  // the root, ignoring their own useI18n options (vue-i18n 11.4.8
  // createComposer: `__root ? __root.missingWarn : options...`). And the
  // "Fall back to translate ... with root locale" warning fires when
  // `fallbackWarn || missingWarn` — so fallbackWarn:false alone is NOT
  // enough; missingWarn defaults to true and keeps it firing.
  missingWarn: false,
  fallbackWarn: false,
});
