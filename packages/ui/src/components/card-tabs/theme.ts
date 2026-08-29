import { ThemeVarValue } from "@noob-naive-ui/registry";
import { COMPONENT_ID } from "./root";

export type CardTabsThemeVars = {
  gap: ThemeVarValue;
  paddingTop: ThemeVarValue;
  paddingBottom: ThemeVarValue;
  // Geometrically it doesn't sense to have separate cardInnerRadiiTopX and cardInnerRadiiBottomX
  innerRadiiX: ThemeVarValue;
  innerRadiiTopY: ThemeVarValue;
  innerRadiiBottomY: ThemeVarValue;
  contentPaddingX: ThemeVarValue;
  contentPaddingTop: ThemeVarValue;
  contentPaddingBottom: ThemeVarValue;
  filletRadiiX: ThemeVarValue;
  filletRadiiY: ThemeVarValue;
  cardMaxWidth: ThemeVarValue;
  cardMinWidth: ThemeVarValue;
  activeCardColor: string;
  cardColorOnHover: string;
  backgroundColor: string;
  activeCardTextColor: string;
  inactiveCardTextColor: string;
  cardTextColorOnHover: string;
  borderColor: string;
  innerBorderColor: string; // default transparent (no border)
  innerBorderOnHover: string; // default transparent (no border)

  // private computed vars (shorten long values + satisfy Tailwind's scanner
  // for runtime-var-driven utilities like col-start-)
  colTemplate: string;
  rowTemplate: string;
  barBackground: string;
  colStart: string;
  rowStart: string;
  /** Number of real (middle) tabs — drives `repeat(var(--…-n-tabs), …)`. */
  nTabs: string;
  innerRadiiTop: string;
  innerRadiiBottom: string;
  filletRadii: string;
  barBorder: string;
  activeTabBorder: string;
};

declare module "@noob-naive-ui/ui" {
  interface NoobUiThemeComponents {
    [COMPONENT_ID]: CardTabsThemeVars;
  }
}
