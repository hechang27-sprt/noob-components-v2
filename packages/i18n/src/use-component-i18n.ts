import { inject, provide, type InjectionKey } from "vue";
import { useI18n, type Composer } from "vue-i18n";
import {
  libraryOverridesKey,
  type DeepPartial,
  type RegistryI18nLibraryKey,
  type RegistryLocale,
  type RegistryLocaleName,
} from "@noob-naive-ui/registry";

/**
 * The frozen empty override tree every package falls back to when its
 * registry entry is absent. Shared because it is identical for every package.
 */
export const emptySnapshot: Readonly<Record<string, never>> = Object.freeze({});

/**
 * Selects one component's override slice from an override message tree.
 * Only locales that actually carry a slice are returned, so absent locale
 * keys never yield undefined override entries.
 *
 * @typeParam LocaleName - Supported packaged locale identifiers.
 * @typeParam Locale - The library's component-first full message schema.
 * @typeParam ComponentId - One stable component identifier (resource stem).
 * @param messages - The override message tree.
 * @param componentId - The component whose slice is requested.
 * @returns The per-locale override slices present for the component.
 */
export function selectComponentOverrides<
  LocaleName extends string,
  Locale extends object,
  ComponentId extends keyof Locale & string,
>(
  messages: Partial<Record<LocaleName, DeepPartial<Locale>>>,
  componentId: ComponentId,
): Partial<Record<LocaleName, DeepPartial<Locale[ComponentId]>>> {
  const selected: Partial<
    Record<LocaleName, DeepPartial<Locale[ComponentId]>>
  > = {};
  // `Object.keys` widens the generic locale keys to `string`, so the single
  // cast here restores the LocaleName key type for the assignment below;
  // iteration semantics (own enumerable keys, insertion order) match the
  // locale-first message tree exactly.
  for (const locale of Object.keys(messages) as LocaleName[]) {
    const slice = messages[locale]?.[componentId];
    if (slice !== undefined) {
      selected[locale] = slice;
    }
  }
  return selected;
}

/**
 * Options for {@link createComponentI18n}.
 *
 * @typeParam K - The library's stable registry key (`keyof
 * LibraryOverridesRegistry` with a declared locale schema).
 * @typeParam LocaleName - Supported packaged locale identifiers, defaulted
 * from the registry entry's declared `locale` record keys.
 * @typeParam Locale - The library's component-first full message schema,
 * defaulted from the registry entry's declared `locale` record value.
 */
export interface CreateComponentI18nOptions<
  K extends RegistryI18nLibraryKey,
  LocaleName extends RegistryLocaleName<K> = RegistryLocaleName<K>,
  Locale extends object = RegistryLocale<K> & object,
> {
  /** Packaged defaults, locale-first resource object (e.g. `{ en, "zh-CN" }`). */
  messages: Readonly<Record<NoInfer<LocaleName>, unknown>>;
  /**
   * The library's stable registry key; the registry entry's declared `locale`
   * schema pins the override types (no separate descriptor handle).
   */
  libraryId: K;
  /** The component's resource file stem, selecting its override slice. */
  componentId: NoInfer<keyof Locale & string>;
}

/**
 * Identifies the nearest ancestor's freshly created local component Composer,
 * resolved by {@link getComponentI18n}. Module-private: descendants reach the
 * composer only through the public accessor.
 */
const componentI18nKey: InjectionKey<Composer> = Symbol("ComponentI18n");

/**
 * Creates one package component's Vue I18n registry: a fresh local Composer
 * inheriting the host's root locale and fallback locale, seeded with the
 * packaged default messages and then the component's override slice
 * so overrides win at the leaf. Each call builds a NEW Composer (it is not
 * idempotent) and provides it to descendants via {@link getComponentI18n}.
 *
 * - The Composer is created with `useScope: "local"`, `inheritLocale: true`
 *   and `fallbackRoot: true`, then corrected post-creation. With
 *   `__root && inheritLocale` Vue I18n 11.4.8 initializes the fallback
 *   settings from the root/global Composer rather than the options. The
 *   inherited fallback locale (host-owned) is kept and root-message fallback
 *   stays enabled, so keys absent from the package registry — notably
 *   host-authored tab labels and other host-global messages — resolve
 *   through this same local Composer.
 * - The locale schema is NOT passed in: it is derived from the library's
 *   `LibraryOverridesRegistry` module augmentation via `libraryId`, so each
 *   package declares its locale schema exactly once.
 * - Absent a provided snapshot, `inject` yields the frozen empty snapshot,
 *   so the packaged defaults always render.
 *
 * @param options - Packaged defaults, the library's registry key, and
 * the component's resource file stem.
 * @returns The fresh local Composer (fallbackRoot already corrected).
 */
export function createComponentI18n<
  K extends RegistryI18nLibraryKey,
  LocaleName extends RegistryLocaleName<K> = RegistryLocaleName<K>,
  Locale extends object = RegistryLocale<K> & object,
>(options: CreateComponentI18nOptions<K, LocaleName, Locale>): Composer {
  const { messages, libraryId, componentId } = options;

  // Resolve this library's i18n override snapshot from the shared,
  // libraryId-keyed registry; absent an entry the frozen empty snapshot
  // renders packaged defaults. The registry value is loose at the provider
  // boundary, so the cast here is the consumer-side contract the registry
  // entry's declared locale schema enforces. The registry is a ComputedRef
  // provided by the per-package ConfigProviders (AdminConfigProvider /
  // AdminUiConfigProvider) that the admin aggregator mounts — AdminProvider
  // itself provides nothing; the optional chaining handles a missing provider.
  const registry = inject(libraryOverridesKey, null);
  const snapshot = (registry?.value?.[libraryId]?.i18n ??
    emptySnapshot) as Partial<Record<LocaleName, DeepPartial<Locale>>>;

  // Fresh local registry inheriting root locale and fallback locale; the
  // root's fallbackRoot flag is corrected below after creation.
  const composer = useI18n({
    useScope: "local",
    inheritLocale: true,
    fallbackRoot: true,
    fallbackWarn: false,
  });

  // Vue I18n 11.4.8: with `__root && inheritLocale` the local Composer
  // initializes its fallback settings from the root/global Composer rather
  // than the options. Keep the inherited fallback locale (host-owned) and
  // keep root-message fallback enabled so keys missing from the package
  // registry (host-authored tab labels, host-global messages) resolve
  // through the same local Composer.
  composer.fallbackRoot = true;

  // Vue I18n documents these Composer functions as safely destructurable;
  // its types do not yet convey that to the strict unbound-method rule.
  // oxlint-disable-next-line typescript/unbound-method
  const { mergeLocaleMessage } = composer;

  // Fresh registry: packaged defaults first, the component override slice
  // second, so overrides win at the leaf without mutating the imports.
  // `Object.entries` yields `string` keys, which satisfy `mergeLocaleMessage`'s
  // `Locale` key; both iterate own enumerable pairs in insertion order.
  for (const [locale, componentMessages] of Object.entries(messages)) {
    mergeLocaleMessage(locale, componentMessages);
  }

  for (const [overrideLocale, componentMessages] of Object.entries(
    selectComponentOverrides(snapshot, componentId),
  )) {
    // The type keeps locale keys optional, so guard the definedness that
    // iteration guarantees at runtime; no locale cast.
    if (componentMessages !== undefined) {
      mergeLocaleMessage(overrideLocale, componentMessages);
    }
  }

  provide(componentI18nKey, composer);

  return composer;
}

/**
 * Resolves the nearest ancestor component Composer created by
 * {@link createComponentI18n}.
 *
 * @returns The nearest ancestor's local component Composer.
 * @throws When the caller is not rendered beneath a `createComponentI18n`
 * provider (mirrors `useAdminShell`'s fail-fast contract).
 */
export function getComponentI18n(): Composer {
  const composer = inject(componentI18nKey);
  if (!composer) {
    throw new Error(
      "getComponentI18n() requires an ancestor component Composer created by createComponentI18n().",
    );
  }
  return composer;
}
