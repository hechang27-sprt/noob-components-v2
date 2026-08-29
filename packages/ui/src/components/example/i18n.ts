import { LocaleFileMap } from "../../locales/locale-types.generated";
import { COMPONENT_ID } from "./root";

export type NoobUiExampleLocale = LocaleFileMap["Example"]["en"];

declare module "@noob-naive-ui/ui" {
  interface NoobUiLocale {
    [COMPONENT_ID]: NoobUiExampleLocale;
  }
}
