import { defineComponent, inject } from "vue";
import { useI18n } from "vue-i18n";

import en from "./locales/PrototypeCard/en.json";
import zhCN from "./locales/PrototypeCard/zh-CN.json";
import {
  DEFAULT_SNAPSHOT,
  selectComponentOverrides,
  prototypeI18nOverridesKey,
  type PrototypeLocale,
} from "./plugin";

/**
 * Renders a localized card through a fresh, empty component-local Composer.
 *
 * The Composer starts empty with `useScope: "local"`, `inheritLocale: true`
 * and `fallbackRoot: false`, then merges the packaged defaults first and the
 * component's plugin override slice second. Starting empty keeps each instance
 * registry independent and never mutates the module-level JSON imports.
 */
const PrototypeCard = defineComponent(
  () => {
    const snapshot = inject(prototypeI18nOverridesKey, DEFAULT_SNAPSHOT);

    const composer = useI18n({
      useScope: "local",
      inheritLocale: true,
      fallbackRoot: false,
      fallbackLocale: snapshot.fallbackLocale,
    });

    // Vue I18n 11.4.8: with `__root && inheritLocale` the local Composer
    // initializes its fallbackLocale from the root/global Composer instead of
    // the `fallbackLocale` option, and inherits the root's `fallbackRoot`.
    // Apply the plugin-configured fallback and registry isolation explicitly
    // right after creation so packaged behavior never depends on host globals.
    composer.fallbackLocale.value = snapshot.fallbackLocale;
    composer.fallbackRoot = false;

    // Fresh registry: packaged defaults first, the component's override slice
    // second, so overrides win at the leaf without mutating the imports.
    composer.mergeLocaleMessage("en", en);
    composer.mergeLocaleMessage("zh-CN", zhCN);
    for (const [locale, messages] of Object.entries(
      selectComponentOverrides(snapshot, "PrototypeCard"),
    )) {
      composer.mergeLocaleMessage(locale as PrototypeLocale, messages);
    }

    return () => (
      <section
        data-prototype-i18n-card
        data-prototype-i18n-locale={composer.locale.value}
        data-prototype-i18n-fallback={snapshot.fallbackLocale}>
        <h3 data-prototype-i18n-title>{composer.t("title")}</h3>
        <p data-prototype-i18n-description>{composer.t("description")}</p>
      </section>
    );
  },
  { name: "PrototypeCard" },
);

export default PrototypeCard;
