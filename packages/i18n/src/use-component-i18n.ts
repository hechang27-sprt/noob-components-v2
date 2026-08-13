import { inject, provide, type InjectionKey } from "vue";
import { useI18n, type Composer } from "vue-i18n";
import {
  emptySnapshot,
  libraryI18nOverridesKey,
  selectComponentOverrides,
  type LibraryI18nDescriptor,
  type LibraryI18nOverrides,
} from "./library-i18n-descriptor";

/**
 * Options for {@link createComponentI18n}.
 *
 * @typeParam LocaleName - Supported packaged locale identifiers.
 * @typeParam Locale - The library's component-first full message schema.
 */
export interface CreateComponentI18nOptions<
  LocaleName extends string,
  Locale extends object,
> {
  /** Packaged defaults, locale-first resource object (e.g. `{ en, "zh-CN" }`). */
  messages: Readonly<Record<LocaleName, unknown>>;
  /** The library's i18n descriptor produced by the shared factory. */
  descriptor: LibraryI18nDescriptor<LocaleName, Locale>;
  /** The component's resource file stem, selecting its override slice. */
  componentId: keyof Locale & string;
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
 * - Absent a provided snapshot, `inject` yields the descriptor's frozen empty
 *   snapshot, so the packaged defaults always render.
 *
 * @param options - Packaged defaults, the library i18n descriptor, and
 * the component's resource file stem.
 * @returns The fresh local Composer (fallbackRoot already corrected).
 */
export function createComponentI18n<
  LocaleName extends string,
  Locale extends object,
>(options: CreateComponentI18nOptions<LocaleName, Locale>): Composer {
  const { messages, descriptor, componentId } = options;

  // Resolve this library's override snapshot from the shared, libraryId-keyed
  // registry; absent an entry the frozen empty snapshot renders packaged
  // defaults. The registry value is loose at the provider boundary, so the
  // cast here is the consumer-side contract the descriptor's selector enforces.
  const registry = inject(libraryI18nOverridesKey, {});
  const snapshot = (registry[descriptor.libraryId] ??
    emptySnapshot) as LibraryI18nOverrides<LocaleName, Locale>;

  // Fresh local registry inheriting root locale and fallback locale; the
  // root's fallbackRoot flag is corrected below after creation.
  const composer = useI18n({
    useScope: "local",
    inheritLocale: true,
    fallbackRoot: true,
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
  // `Object.entries` keeps generic key types as `string` (tsafe's
  // objectEntries widens generic keys to `string | number | symbol`, which
  // would not satisfy `mergeLocaleMessage`'s `Locale` key); both iterate own
  // enumerable pairs in insertion order.
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
