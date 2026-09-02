import "./style.css";

export type {
  NoobUiLocale,
  NoobUiLocaleName,
  NoobUiLocaleOverrides,
} from "./i18n";

export {
  AdminUiConfigProvider,
  type AdminUiConfigProviderProps,
} from "./config-provider";
export { useUiTheme } from "./theme";
export {
  CSS_PREFIX,
  noobUiTheme,
  type NoobUiThemeOverrides,
  type NoobUiThemeComponents,
} from "./theme";

export * from "./registry";

// Components
export * from "./components/example";
export * from "./components/card-tabs";
export * from "./components/hmr-test";
