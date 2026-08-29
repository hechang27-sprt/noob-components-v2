import { computed, defineComponent, inject, provide } from "vue";
import { merge } from "es-toolkit";
import {
  libraryOverridesKey,
  type LibraryOverridesRegistryValue,
} from "@noob-naive-ui/registry";
import { type NoobUiLocaleOverrides } from "./i18n";
import type { NoobUiThemeOverrides } from "./theme";
import { LIB_ID } from "./registry";

/**
 * Per-package override provider for the ui library's slice of the shared
 * unified registry (`{ i18n, theme }` under the ui `libraryId`).
 *
 * Standalone-capable: when rendered outside any aggregator (or another
 * `AdminUiConfigProvider`), `inject(libraryOverridesKey, null)` yields `null`
 * and this provider supplies its own slice only. When nested beneath a parent
 * provider, it merges its slice over the parent value, so the nearest provider
 * wins for its subtree.
 */
export interface AdminUiConfigProviderProps {
  /** ui package locale overrides (`NoobUiLocaleOverrides`). */
  i18n?: NoobUiLocaleOverrides;
  /** ui package themeVar overrides, structurally typed by component. */
  themeOverride?: NoobUiThemeOverrides;
}

/**
 * Provides the ui package's `{ i18n, theme }` slice into the shared unified
 * override registry, layered over any parent registry (nearest wins).
 */
export const AdminUiConfigProvider = defineComponent(
  (props: AdminUiConfigProviderProps, { slots }) => {
    const parent = inject(libraryOverridesKey, null);
    const merged = computed<LibraryOverridesRegistryValue>(() =>
      merge(merge({}, parent?.value ?? {}), {
        [LIB_ID]: {
          i18n: props.i18n,
          theme: props.themeOverride,
        },
      }),
    );
    provide(libraryOverridesKey, merged);
    return () => slots.default?.();
  },
  {
    name: "AdminUiConfigProvider",
    props: {
      i18n: { type: Object, default: undefined },
      themeOverride: { type: Object, default: undefined },
    },
  },
);
