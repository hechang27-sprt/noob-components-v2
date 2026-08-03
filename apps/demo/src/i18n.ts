import { createI18n } from "vue-i18n";

import demoMessages from "./locales/demo.json";

/**
 * The demo's single Composition API global Vue I18n instance.
 *
 * The host owns the active locale (seeded from the hydrated preference store
 * in `main.ts`), the fallback locale, and the demo's own app-level messages.
 * AdminShell owns all later store → Composer synchronization; non-component
 * modules (menu, tab labels) translate through `i18n.global.t`.
 */
export const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages: demoMessages,
});
