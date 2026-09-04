import { LocaleFileMap } from "../../locales/locale-types.generated";
import { COMPONENT_ID as ROOT } from "./root";
import { COMPONENT_ID as CONTROLLER } from "./controller";

export type NoobUiHMRTestLocale = LocaleFileMap["HMRTest"]["en"];
export type NoobUiHMRInternalLocale = LocaleFileMap["HMRController"]["en"];

declare module "@noob-naive-ui/ui" {
  interface NoobUiLocale {
    [ROOT]: NoobUiHMRTestLocale;
    [CONTROLLER]: NoobUiHMRInternalLocale;
  }
}
