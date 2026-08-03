import "./style.css";

export {
  defineNoobNaiveThemeBridge,
  toNoobNaiveThemeOverrides,
  type NoobNaiveThemeBridge,
} from "./theme/naive";

export { noobUiI18nPlugin } from "./i18n/plugin";
export type {
  NoobUiComponentId,
  NoobUiI18nPluginOptions,
  NoobUiI18nSnapshot,
  NoobUiLocaleName,
  NoobUiLocaleOverrides,
} from "./i18n/plugin";
