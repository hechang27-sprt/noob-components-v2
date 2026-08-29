import type { RegistryI18nOverrides } from "@noob-naive-ui/registry";
import { LIB_ID } from "./registry";

/** Supported packaged locale identifiers for ui package components. */
export type NoobUiLocaleName = "en" | "zh-CN";

/**
 * The ui library's full per-locale message schema. No components translate
 * yet, so the schema is empty; extend it as translating components land.
 */
export interface NoobUiLocale {}

/**
 * Locale-keyed, component-addressable partial override tree accepted by the
 * ui package. With no components registered yet, hosts can only supply empty
 * per-locale slices; the seam ships ahead of the first translating component.
 * Derived from the framework-wide registry (the ui augmentation), so the
 * partial-tree machinery lives in exactly one place.
 */
export type NoobUiLocaleOverrides = NonNullable<
  RegistryI18nOverrides[typeof LIB_ID]
>;
