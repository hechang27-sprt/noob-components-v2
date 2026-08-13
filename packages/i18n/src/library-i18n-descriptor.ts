import type { InjectionKey } from "vue";
import { objectEntries } from "tsafe/objectEntries";

/**
 * Recursively makes every message leaf optional for partial override trees.
 *
 * @typeParam T - The full message shape being made optional.
 */
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Locale-first partial override tree accepted by one component library.
 * Every level is optional so hosts override only the message leaves they own.
 *
 * @typeParam LocaleName - Supported packaged locale identifiers.
 * @typeParam Locale - The library's component-first full message schema.
 */
export type LibraryI18nOverrides<
  LocaleName extends string,
  Locale extends object,
> = Partial<Record<LocaleName, DeepPartial<Locale>>>;

/**
 * Immutable, application-scoped startup snapshot of a library's override
 * tree. Locale and fallback authority stay with the host global Composer.
 *
 * @typeParam LocaleName - Supported packaged locale identifiers.
 * @typeParam Locale - The library's component-first full message schema.
 */
export type LibraryI18nSnapshot<
  LocaleName extends string,
  Locale extends object,
> = LibraryI18nOverrides<LocaleName, Locale>;

/**
 * App-scoped override registry shared by every component package. Keyed by
 * each package's stable `libraryId`, so a single provider (the admin
 * `AdminProvider` `overrides` prop) can supply overrides for all packages
 * without one provider per package. Each entry is a bare override tree (no
 * `messages` wrapper). The value is deliberately loose at the provider
 * boundary: hosts type each entry with `satisfies <Package>Overrides`, and
 * each package's descriptor re-validates and types its own entry at
 * consumption.
 */
export interface LibraryI18nOverridesRegistry {
  [libraryId: string]: unknown;
}

/**
 * The single injection key under which the override registry is provided.
 * Shared across all component packages; consumers look up their own
 * `libraryId` rather than injecting a per-package key.
 */
export const libraryI18nOverridesKey: InjectionKey<LibraryI18nOverridesRegistry> =
  Symbol("noob-naive-ui:i18n-overrides-registry");

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
 */
export type LibraryI18nComponentSelector<
  LocaleName extends string,
  Locale extends object,
> = <ComponentId extends keyof Locale & string>(
  messages: LibraryI18nOverrides<LocaleName, Locale>,
  componentId: ComponentId,
) => Partial<Record<LocaleName, DeepPartial<Locale[ComponentId]>>>;

/**
 * One component library's typed i18n handle. The runtime value is only the
 * stable `libraryId` under which overrides live in the shared registry; the
 * generic parameters pin the package's locale schema so `createComponentI18n`
 * can type its component selector and override fallback per package. Hosts
 * provide the override registry once (e.g. the admin `AdminProvider`
 * `overrides` prop); there is no Vue plugin and no per-package provider.
 *
 * @typeParam LocaleName - Supported packaged locale identifiers.
 * @typeParam Locale - The library's component-first full message schema.
 */
export type LibraryI18nDescriptor<
  LocaleName extends string,
  Locale extends object,
> = {
  /** Stable per-library identifier under which overrides live in the registry. */
  libraryId: string;
  /**
   * Type-level brand pinning the package's locale schema so
   * `createComponentI18n` can infer it from the annotated handle. Never
   * present at runtime.
   */
  readonly __i18n?: LibraryI18nOverrides<LocaleName, Locale>;
};

/**
 * Selects one component's override slice from an override message tree.
 * Shared because the selector is generic over the package's locale schema and
 * identical for every package.
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
  messages: LibraryI18nOverrides<LocaleName, Locale>,
  componentId: ComponentId,
): Partial<Record<LocaleName, DeepPartial<Locale[ComponentId]>>> {
  const selected: Partial<
    Record<LocaleName, DeepPartial<Locale[ComponentId]>>
  > = {};
  // tsafe's objectEntries keeps generic key types instead of widening to
  // `string | number | symbol`, which would break indexing by LocaleName.
  for (const [locale, components] of objectEntries(messages)) {
    const slice = components?.[componentId];
    if (slice !== undefined) {
      selected[locale] = slice;
    }
  }
  return selected;
}
