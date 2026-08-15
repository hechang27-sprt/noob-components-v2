import type { RegistryI18nOverrides } from "@noob-naive-ui/registry";

/**
 * The admin package's stable library key under which hosts provide admin
 * overrides in the shared override registry (via the `AdminProvider`
 * `i18nOverrides` prop). The `LibraryOverridesRegistry` module augmentation
 * declares the FULL admin locale schema, so `createComponentI18n` derives it
 * from this key alone — there is no separate descriptor handle.
 */
export const adminI18n = "noob-naive-ui:admin" as const;

/** The admin package's immutable, application-scoped override snapshot. */
export type AdminI18nSnapshot = NonNullable<
  RegistryI18nOverrides["noob-naive-ui:admin"]
>;
