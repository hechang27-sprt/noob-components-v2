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
 * Locale-first partial override tree accepted by one component library's
 * descriptor. Every level is optional so hosts override only the message
 * leaves they own.
 *
 * @typeParam LocaleName - Supported packaged locale identifiers.
 * @typeParam Locale - The library's component-first full message schema.
 */
export type LibraryI18nOverrides<
  LocaleName extends string,
  Locale extends object,
> = Partial<Record<LocaleName, DeepPartial<Locale>>>;

/**
 * Immutable, application-scoped startup snapshot of a library's message
 * overrides. Carries only message overrides; locale and fallback authority
 * stay with the host global Composer.
 *
 * @typeParam LocaleName - Supported packaged locale identifiers.
 * @typeParam Locale - The library's component-first full message schema.
 */
export interface LibraryI18nSnapshot<
  LocaleName extends string,
  Locale extends object,
> {
  messages: LibraryI18nOverrides<LocaleName, Locale>;
}

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
 * One component library's i18n descriptor produced by
 * {@link createLibraryI18nDescriptor}. Carries the typed injection key the
 * override snapshot is provided under, the frozen empty snapshot, and the
 * generic component slice selector. It no longer carries a Vue plugin: hosts
 * provide the override snapshot themselves (e.g. the admin `AdminProvider`
 * `overrides` prop) via the injection key.
 *
 * @typeParam LocaleName - Supported packaged locale identifiers.
 * @typeParam Locale - The library's component-first full message schema.
 */
export interface LibraryI18nDescriptor<
  LocaleName extends string,
  Locale extends object,
> {
  /** Typed injection key of the app-scoped override snapshot. */
  overridesKey: InjectionKey<LibraryI18nSnapshot<LocaleName, Locale>>;
  /** Frozen empty snapshot used when no overrides are provided. */
  emptySnapshot: Readonly<LibraryI18nSnapshot<LocaleName, Locale>>;
  /** Selects one component's override slice from a snapshot message tree. */
  selectComponentOverrides: LibraryI18nComponentSelector<LocaleName, Locale>;
}

/**
 * Selects one component's override slice from an override message tree.
 *
 * @typeParam LocaleName - Supported packaged locale identifiers.
 * @typeParam Locale - The library's component-first full message schema.
 * @typeParam ComponentId - One stable component identifier (resource stem).
 * @param messages - The override message tree.
 * @param componentId - The component whose slice is requested.
 * @returns The per-locale override slices present for the component.
 */
function selectComponentSlice<
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

/**
 * Creates one component library's i18n descriptor.
 *
 * Library locale resources follow the standardized
 * `src/locales/<ComponentName>.json` contract (locale-first records), so the
 * injection key, the empty snapshot, and the component slice selector are all
 * derivable from the library's message schema and do not need per-package
 * implementations. The descriptor never creates an i18n instance and never
 * registers global messages; it only names the contract under which hosts
 * provide override snapshots.
 *
 * @typeParam LocaleName - Supported packaged locale identifiers.
 * @typeParam Locale - The library's component-first full message schema.
 * @param config - Factory configuration identifying the library.
 * @returns The injection key, the empty snapshot, and the selector.
 */
export function createLibraryI18nDescriptor<
  LocaleName extends string,
  Locale extends object,
>(config: { libraryId: string }): LibraryI18nDescriptor<LocaleName, Locale> {
  const overridesKey: InjectionKey<LibraryI18nSnapshot<LocaleName, Locale>> =
    Symbol(`${config.libraryId}:i18n-overrides`);
  const emptySnapshot: Readonly<LibraryI18nSnapshot<LocaleName, Locale>> =
    Object.freeze({ messages: {} });
  return {
    overridesKey,
    emptySnapshot,
    selectComponentOverrides: selectComponentSlice,
  };
}
