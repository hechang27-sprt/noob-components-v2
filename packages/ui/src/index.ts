import "./style.css";

export { noobUiI18n } from "./i18n/plugin";
export type {
  NoobUiComponentId,
  NoobUiI18nSnapshot,
  NoobUiLocale,
  NoobUiLocaleName,
  NoobUiLocaleOverrides,
} from "./i18n/plugin";

export {
  AdminUiConfigProvider,
  type AdminUiConfigProviderProps,
} from "./theme/admin-ui-config-provider";
export { useUiTheme } from "./theme/use-ui-theme";
export {
  noobUiCssPrefix,
  noobUiTheme,
  type NoobUiThemeOverrides,
  type UiThemeComponents,
} from "./theme/types";

// Components
export { UiCard, type UiCardThemeVars } from "./components/card/ui-card";
export * from "./components/card-tabs";
