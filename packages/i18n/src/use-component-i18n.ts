import { inject, type Ref } from "vue";
import { useI18n, type Composer } from "vue-i18n";
import type { LibraryI18nPlugin } from "./library-i18n-plugin";

/**
 * Options for {@link useComponentI18n}.
 *
 * @typeParam LocaleName - Supported packaged locale identifiers.
 * @typeParam Locale - The library's component-first full message schema.
 */
export interface UseComponentI18nOptions<
  LocaleName extends string,
  Locale extends object,
> {
  /** Packaged defaults, locale-first resource object (e.g. `{ en, "zh-CN" }`). */
  messages: Readonly<Record<LocaleName, unknown>>;
  /** The library's i18n plugin descriptor produced by the shared factory. */
  plugin: LibraryI18nPlugin<LocaleName, Locale>;
  /** The component's resource file stem, selecting its override slice. */
  componentId: keyof Locale & string;
}

/** Result of {@link useComponentI18n}. */
export interface UseComponentI18nReturn {
  /** The fresh local Composer (fallbackRoot already corrected). */
  composer: Composer;
  /** Bound translator rendering merged defaults + overrides. */
  t: Composer["t"];
  /** The Composer's reactive active locale (inherits the root). */
  locale: Ref<string>;
}

/**
 * Sets up one package component's Vue I18n registry: a fresh local Composer
 * inheriting the host's root locale and fallback locale, seeded with the
 * packaged default messages and then the component's plugin override slice
 * so overrides win at the leaf.
 *
 * - The Composer is created with `useScope: "local"`, `inheritLocale: true`
 *   and `fallbackRoot: false`, then corrected post-creation. With
 *   `__root && inheritLocale` Vue I18n 11.4.8 initializes the fallback
 *   settings from the root/global Composer rather than the options; the
 *   inherited fallback locale (host-owned) is kept while root-message
 *   fallback is disabled so missing package keys never resolve from
 *   host-global message registries.
 * - Absent plugin installation, `inject` yields the plugin's frozen empty
 *   snapshot, so the packaged defaults always render.
 *
 * @param options - Packaged defaults, the library plugin descriptor, and
 * the component's resource file stem.
 * @returns The Composer, its bound translator, and its active locale ref.
 */
export function useComponentI18n<
  LocaleName extends string,
  Locale extends object,
>(
  options: UseComponentI18nOptions<LocaleName, Locale>,
): UseComponentI18nReturn {
  const { messages, plugin, componentId } = options;

  // The plugin's immutable override tree; absent plugin installation yields
  // the frozen empty snapshot, so packaged defaults always render.
  const snapshot = inject(plugin.overridesKey, plugin.emptySnapshot);

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

  // Vue I18n documents these Composer functions as safely destructurable;
  // its types do not yet convey that to the strict unbound-method rule.
  // oxlint-disable-next-line typescript/unbound-method
  const { mergeLocaleMessage, t } = composer;

  // Fresh registry: packaged defaults first, the component override slice
  // second, so overrides win at the leaf without mutating the imports.
  // `Object.entries` keeps generic key types as `string` (tsafe's
  // objectEntries widens generic keys to `string | number | symbol`, which
  // would not satisfy `mergeLocaleMessage`'s `Locale` key); both iterate own
  // enumerable pairs in insertion order.
  for (const [locale, componentMessages] of Object.entries(messages)) {
    mergeLocaleMessage(locale, componentMessages);
  }

  for (const [overrideLocale, componentMessages] of Object.entries(
    plugin.selectComponentOverrides(snapshot.messages, componentId),
  )) {
    // The type keeps locale keys optional, so guard the definedness that
    // iteration guarantees at runtime; no locale cast.
    if (componentMessages !== undefined) {
      mergeLocaleMessage(overrideLocale, componentMessages);
    }
  }

  return { composer, t, locale: composer.locale };
}
