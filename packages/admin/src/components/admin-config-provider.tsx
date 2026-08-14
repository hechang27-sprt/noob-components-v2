import { computed, defineComponent, inject, provide } from "vue";
import { merge } from "es-toolkit";
import {
  libraryOverridesKey,
  type LibraryOverridesRegistryValue,
} from "@noob-naive-ui/registry";
import { adminI18n } from "../i18n/plugin";
import type { AdminLocaleOverrides } from "../i18n/admin-locale";
import type { AdminThemeOverrides } from "../runtime-contract";

/**
 * Per-package override provider for the admin library's slice of the shared
 * unified registry (`{ i18n, theme }` under the admin `libraryId`).
 *
 * Standalone-capable: when rendered outside any `AdminProvider` (or another
 * `AdminConfigProvider`), `inject(libraryOverridesKey, null)` yields `null` and
 * this provider supplies its own slice only. When nested beneath an
 * aggregator or a parent provider, it merges its slice over the parent value,
 * so the nearest provider wins for its subtree.
 */
export interface AdminConfigProviderProps {
  /** Admin package locale overrides (`LibraryI18nOverrides<AdminLocaleName, AdminLocale>`). */
  i18n?: AdminLocaleOverrides;
  /** Admin package themeVar overrides; an empty seam until admin ships theme components. */
  themeOverride?: AdminThemeOverrides;
}

/**
 * Provides the admin package's `{ i18n, theme }` slice into the shared unified
 * override registry, layered over any parent registry (nearest wins).
 */
export const AdminConfigProvider = defineComponent(
  (props: AdminConfigProviderProps, { slots }) => {
    const parent = inject(libraryOverridesKey, null);
    const merged = computed<LibraryOverridesRegistryValue>(() =>
      merge(
        merge({}, parent?.value ?? {}),
        {
          [adminI18n.libraryId]: {
            i18n: props.i18n,
            theme: props.themeOverride,
          },
        },
      ),
    );
    provide(libraryOverridesKey, merged);
    return () => slots.default?.();
  },
  {
    name: "AdminConfigProvider",
    props: {
      i18n: { type: Object, default: undefined },
      themeOverride: { type: Object, default: undefined },
    },
  },
);
