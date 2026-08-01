import { objectEntries } from "tsafe/objectEntries";
import { defineComponent, inject } from "vue";
import { useI18n } from "vue-i18n";

import en from "./locales/PrototypeCard/en.json";
import zhCN from "./locales/PrototypeCard/zh-CN.json";
import {
  DEFAULT_SNAPSHOT,
  prototypeI18nOverridesKey,
  selectComponentOverrides,
} from "./plugin";

/**
 * Renders a localized card through a fresh, empty component-local Composer.
 *
 * The Composer starts empty with `useScope: "local"`, `inheritLocale: true`
 * and `fallbackRoot: false`, then merges the packaged defaults first and the
 * component's plugin override slice second. Starting empty keeps each instance
 * registry independent and never mutates the module-level JSON imports.
 * Locale and fallback-locale values inherit from the host global Composer,
 * which remains the sole locale/fallback authority.
 */
const PrototypeCard = defineComponent(
  () => {
    // The plugin's immutable override tree; absent plugin installation yields
    // the frozen empty snapshot, so packaged defaults always render.
    const { messages } = inject(prototypeI18nOverridesKey, DEFAULT_SNAPSHOT);

    // Fresh local registry inheriting root locale and fallback locale; the
    // root's fallbackRoot flag is corrected below after creation.
    const composer = useI18n({
      useScope: "local",
      inheritLocale: true,
      fallbackRoot: false,
    });

    // Vue I18n 11.4.8: with `__root && inheritLocale` the local Composer
    // initializes its fallback settings from the root/global Composer rather
    // than the options. Keep the inherited fallback locale (host-owned) but
    // disable root-message fallback so missing package keys never resolve
    // from host-global message registries.
    composer.fallbackRoot = false;

    // Only the reactive locale data ref is destructured; Composer methods are
    // called through the object so their `this` binding is never in question.
    const { locale } = composer;

    // Fresh registry: packaged defaults first, the component's override slice
    // second, so overrides win at the leaf without mutating the imports.
    composer.mergeLocaleMessage("en", en);
    composer.mergeLocaleMessage("zh-CN", zhCN);
    for (const [overrideLocale, componentMessages] of objectEntries(
      selectComponentOverrides(messages, "PrototypeCard"),
    )) {
      // The type keeps locale keys optional, so guard the definedness that
      // `objectEntries` iteration guarantees at runtime; no locale cast.
      if (componentMessages !== undefined) {
        composer.mergeLocaleMessage(overrideLocale, componentMessages);
      }
    }

    return () => (
      <section
        data-prototype-i18n-card
        data-prototype-i18n-locale={locale.value}>
        <h3 data-prototype-i18n-title>{composer.t("title")}</h3>
        <p data-prototype-i18n-description>{composer.t("description")}</p>
      </section>
    );
  },
  { name: "PrototypeCard" },
);

export default PrototypeCard;
