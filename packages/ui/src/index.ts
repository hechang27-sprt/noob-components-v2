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
  noobUiTheme,
  type NoobUiThemeOverrides,
  type UiThemeComponents,
} from "./theme/types";
export { UiCard, type UiCardThemeVars } from "./card/ui-card";
