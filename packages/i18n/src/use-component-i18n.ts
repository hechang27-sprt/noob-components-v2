import { inject, type InjectionKey, type Ref } from "vue";
import { useI18n, type Composer } from "vue-i18n";

/**
 * Options for {@link useComponentI18n}.
 *
 * @typeParam M - The override tree's message shape (locale-keyed partials).
 * @typeParam S - The plugin's app-scoped override snapshot type.
 * @typeParam Slice - The component's override slice extracted from the
 * snapshot's messages (locale-keyed partial message tree).
 */
export interface UseComponentI18nOptions<
  M extends Record<string, any>,
  S extends { messages: M },
  Slice extends Record<string, any>,
> {
  /** Packaged defaults, locale-first resource object (e.g. `{ en, "zh-CN" }`). */
  messages: Readonly<Record<string, any>>;
  /** Injection key of the app-scoped override snapshot tree. */
  overridesKey: InjectionKey<S>;
  /** Frozen empty snapshot used when no plugin installed the key. */
  emptySnapshot: S;
  /** Extracts this component's override slice from the snapshot's messages. */
  selectOverrides: (messages: M) => Slice;
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
 * - Absent plugin installation, `inject` yields `emptySnapshot`, so the
 *   packaged defaults always render.
 *
 * @param options - Messages, override key, empty snapshot, and selector.
 * @returns The Composer, its bound translator, and its active locale ref.
 */
export function useComponentI18n<
  M extends Record<string, any>,
  S extends { messages: M },
  Slice extends Record<string, any>,
>(options: UseComponentI18nOptions<M, S, Slice>): UseComponentI18nReturn {
  const { messages, overridesKey, emptySnapshot, selectOverrides } = options;

  // The plugin's immutable override tree; absent plugin installation yields
  // the frozen empty snapshot, so packaged defaults always render.
  const snapshot = inject(overridesKey, emptySnapshot);

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
    selectOverrides(snapshot.messages),
  )) {
    // The type keeps locale keys optional, so guard the definedness that
    // iteration guarantees at runtime; no locale cast.
    if (componentMessages !== undefined) {
      mergeLocaleMessage(overrideLocale, componentMessages);
    }
  }

  return { composer, t, locale: composer.locale };
}
