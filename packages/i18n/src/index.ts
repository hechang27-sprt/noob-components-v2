export { i18nTextSchema, resolveI18nText } from "./i18n-text";
export type { I18nText } from "./i18n-text";
export { createComponentI18n, getComponentI18n } from "./use-component-i18n";
export type { CreateComponentI18nOptions } from "./use-component-i18n";
export {
  emptySnapshot,
  libraryI18nOverridesKey,
  selectComponentOverrides,
  type LibraryI18nComponentSelector,
  type LibraryI18nDescriptor,
  type LibraryI18nOverrides,
  type LibraryI18nOverridesRegistry,
  type LibraryI18nSnapshot,
} from "./library-i18n-descriptor";
export { useGlobalI18nSync } from "./use-global-i18n-sync";
export type { UseGlobalI18nSyncOptions } from "./use-global-i18n-sync";
