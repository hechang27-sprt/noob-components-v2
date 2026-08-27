import { defineComponent, toValue, type CSSProperties } from "vue";
import type { ThemeVarValue } from "@noob-naive-ui/registry";
import { useThemeVars } from "naive-ui";
import { useUiTheme } from "../../theme/use-ui-theme";
import { useUiCssVarsFor } from "../../theme/types";
import { useTabController } from "./card-tabs-runtime";
import { HEAD_TAB_KEY, TAIL_TAB_KEY, UiCardTab } from "./card-tab";

// REMINDER: demo for the tab display mechanism: https://play.tailwindcss.com/j8IcWZ4HdN

export type UiCardTabsThemeVars = {
  gap: ThemeVarValue;
  paddingTop: ThemeVarValue;
  paddingBottom: ThemeVarValue;
  // Geometrically it doesn't sense to have separate cardInnerRadiiTopX and cardInnerRadiiBottomX
  cardInnerRadiiX: ThemeVarValue;
  cardInnerRadiiTopY: ThemeVarValue;
  cardInnerRadiiBottomY: ThemeVarValue;
  cardInnerPaddingX: ThemeVarValue;
  cardInnerPaddingTop: ThemeVarValue;
  cardInnerPaddingBottom: ThemeVarValue;
  cardFilletRadiiX: ThemeVarValue;
  cardFilletRadiiY: ThemeVarValue;
  cardMaxWidth: ThemeVarValue;
  cardMinWidth: ThemeVarValue;
  activeCardColor: string;
  cardColorOnHover: string;
  backgroundColor: string;
  activeCardTextColor: string;
  inactiveCardTextColor: string;
  cardTextColorOnHover: string;
  borderColor: string;
  cardInnerBorderColor: string; // default transparent (no border)
  cardInnerBorderOnHover: string; // default transparent (no border)

  // private computed vars (shorten long values + satisfy Tailwind's scanner
  // for runtime-var-driven utilities like col-start-)
  colTemplate: string;
  rowTemplate: string;
  barBackground: string;
  colStart: string;
  rowStart: string;
  /** Number of real (middle) tabs — drives `repeat(var(--…-n-tabs), …)`. */
  nTabs: string;
  cardInnerRadiiTop: string;
  cardInnerRadiiBottom: string;
  cardFilletRadii: string;
};

const DEFAULT_GAP = { small: "0.25rem", medium: "0.5rem", large: "0.75rem" };
const DEFAULT_PADDING = {
  small: "0.25rem",
  medium: "0.5rem",
  large: "0.75rem",
};
const DEFAULT_INNER_RADII = {
  small: "0.25rem",
  medium: "0.5rem",
  large: "0.75rem",
};

declare module "@noob-naive-ui/ui" {
  interface UiThemeComponents {
    CardTabs: UiCardTabsThemeVars;
  }
}

type Props = { modelValue: string };
type Emits = (e: "update:modelValue", v: string) => void;

type Slots = {
  default?: () => unknown;
  head?: () => unknown;
  tail?: () => unknown;
};

/**
 * A connected, segmented tab bar (the "fillet" cut-out look).
 *
 * Structure mirrors the reference demo: a CSS grid whose column template is
 * `repeat(<scopeCount>, gap inner 1fr inner) gap`, with each scope a
 * `grid-cols-subgrid` card positioned via a runtime `col-start` CSS var. Real
 * tabs get a `1fr` body column (consistent size); empty head/tail sentinels
 * collapse to a `0` body track. The whole grid sits inside a horizontally
 * scrollable wrapper.
 *
 * Head/tail: the `head` / `tail` slots place user tabs at the bar ends. When a
 * slot is empty, a default sentinel `UiCardTab` is injected instead (reserved
 * keys). Positioning (index/count) is passed by the parent at render time so
 * the grid stays ordered regardless of tab open/close reorders.
 */
// VDOM port (W1 experiment): UiCardTabs runs classic so the whole tab strip
// (its slot children + per-tab naive buttons) stays inside ONE vdom region;
// the vapor->vdom boundary sits at the AdminShellTabbar edge instead of per
// repeated tab. Keep slot macros off: props/emit/slots come from ctx.
export const UiCardTabs = defineComponent(
  (props: Props, ctx: { emit: Emits; slots: Slots }) => {
    const { emit, slots } = ctx;
    const nThemeVars = useThemeVars();
    const { $css, $var, $tw } = useUiCssVarsFor("CardTabs");

    // Provides the shared controller for the CardTab children (active key,
    // click handling, register/unregister bookkeeping).
    const { tabList, controller } = useTabController({
      activeKey: () => props.modelValue,
      handleClick: (tabKey) => emit("update:modelValue", tabKey),
    });

    const N_TABS = $var("--noob-ui-card-tabs-n-tabs");
    const GAP = $var("--noob-ui-card-tabs-gap");
    const PT = $var("--noob-ui-card-tabs-padding-top");
    const PB = $var("--noob-ui-card-tabs-padding-bottom");
    const RADII_X = $var("--noob-ui-card-tabs-card-inner-radii-x");
    const RADII_YT = $var("--noob-ui-card-tabs-card-inner-radii-top-y");
    const RADII_YB = $var("--noob-ui-card-tabs-card-inner-radii-bottom-y");
    const MINW = $var("--noob-ui-card-tabs-card-min-width");
    const MAXW = $var("--noob-ui-card-tabs-card-max-width");

    const DEFAULT_THEME_VARS: Partial<UiCardTabsThemeVars> = {
      gap: DEFAULT_GAP,
      paddingTop: DEFAULT_PADDING,
      paddingBottom: DEFAULT_PADDING,
      cardInnerRadiiX: DEFAULT_INNER_RADII,
      cardInnerRadiiTopY: DEFAULT_INNER_RADII,
      cardInnerRadiiBottomY: DEFAULT_INNER_RADII,
      cardInnerPaddingX: $var("--noob-ui-card-tabs-card-inner-radii-x"),
      cardInnerPaddingTop: $var("--noob-ui-card-tabs-card-inner-radii-top-y"),
      cardInnerPaddingBottom: $var(
        "--noob-ui-card-tabs-card-inner-radii-bottom-y",
      ),
      cardFilletRadiiX: `calc(${GAP} + ${RADII_X})`,
      cardFilletRadiiY: `calc(${PB} + ${RADII_YB})`,
      cardMaxWidth: "12.5rem",
      cardMinWidth: "6.25rem",
      activeCardColor: nThemeVars.value.baseColor,
      cardColorOnHover: nThemeVars.value.primaryColorHover,
      backgroundColor: nThemeVars.value.tabColor,
      activeCardTextColor: nThemeVars.value.textColorBase,
      inactiveCardTextColor: nThemeVars.value.textColorBase,
      cardTextColorOnHover: nThemeVars.value.baseColor,
      borderColor: nThemeVars.value.borderColor,
      cardInnerRadiiTop: `${RADII_X} ${RADII_YT}`,
      cardInnerRadiiBottom: `${RADII_X} ${RADII_YB}`,
      // Elliptical fillet (space-separated X / Y, valid in the corner
      // longhand): gap+innerX horizontally, padding-bottom+innerY vertically,
      // so the API's separate gap/padding/inner X|Y all feed the arc.
      cardFilletRadii: `${$var("--noob-ui-card-tabs-card-fillet-radii-x")} ${$var("--noob-ui-card-tabs-card-fillet-radii-y")}`,
      rowTemplate: `${PT} ${RADII_X} calc(2 * ${RADII_X}) ${RADII_X} ${PB}`,
      // Declarative column template (no per-scope JS): head cap + N real tabs
      // (repeat) + tail cap, each `gap inner-… minmax/1fr inner-…`. The
      // `--…-n-tabs` recur creates the real-tab track per actual tab.
      colTemplate: `${GAP} ${RADII_X} min-content ${RADII_X} 
      repeat(max(${N_TABS}, 1), ${GAP} ${RADII_X} minmax(${MINW}, ${MAXW}) ${RADII_X}) 
      ${GAP} ${RADII_X} min-content ${RADII_X} ${GAP}`,
      barBackground: `linear-gradient(${$var("--noob-ui-card-tabs-background-color")} 50%, ${$var("--noob-ui-card-tabs-active-card-color")} 50%)`,
    };

    const themeVars = useUiTheme("CardTabs", DEFAULT_THEME_VARS);

    /**
     * Bar-level keyboard navigation. Tabs handle their own keys when focused;
     * this catches arrows/Home/End when focus is anywhere else inside the bar
     * (close button, wrapper, mid-navigation states) so the bar always answers
     * to keyboard input. Skipped when a tab already consumed the event.
     */
    const onBarKeydown = (e: KeyboardEvent): void => {
      if (e.defaultPrevented) return;
      const isLeft = e.key === "ArrowLeft";
      const isRight = e.key === "ArrowRight";
      const isHome = e.key === "Home";
      const isEnd = e.key === "End";
      if (!isLeft && !isRight && !isHome && !isEnd) return;

      const ordered = [...tabList]
        .filter((tab) => tab.mode === "tab")
        .sort((a, b) => a.index - b.index);
      if (ordered.length === 0) return;

      const activeKey = String(toValue(controller.activeKey));
      const activeIdx = ordered.findIndex((tab) => tab.key === activeKey);
      let target;
      if (isHome) target = ordered[0];
      else if (isEnd) target = ordered[ordered.length - 1];
      else {
        const from = activeIdx >= 0 ? activeIdx : 0;
        target = ordered[from + (isRight ? 1 : -1)];
      }
      if (!target) return;
      e.preventDefault();
      controller.handleClick(target.key);
      controller.elementOf(target.key)?.focus({ preventScroll: true });
      requestAnimationFrame(() => {
        const el = controller.elementOf(target.key);
        el?.focus({ preventScroll: true });
        el?.scrollIntoView({ block: "nearest", inline: "nearest" });
      });
    };

    return () => (
      <div
        style={
          {
            ...themeVars.value,
            [$css("--noob-ui-card-tabs-n-tabs")]: tabList.length - 2,
          } as CSSProperties
        }
        class={`w-full h-full overflow-x-auto ${$tw<"bg">("bg-(--noob-ui-card-tabs-background-color)")}`}
        data-card-tabs-scroll
        onKeydown={onBarKeydown}>
        <div
          class={[
            "w-fit",
            "grid",
            $tw("grid-cols-(--noob-ui-card-tabs-col-template)"),
            $tw("grid-rows-(--noob-ui-card-tabs-row-template)"),
            "justify-start",
            $tw<"bg", "image">("bg-(image:--noob-ui-card-tabs-bar-background)"),
          ]}>
          {slots.head?.() ?? <UiCardTab tabKey={HEAD_TAB_KEY} mode="head" />}
          {slots.default?.()}
          {slots.tail?.() ?? <UiCardTab tabKey={TAIL_TAB_KEY} mode="tail" />}
        </div>
      </div>
    );
  },
  {
    name: "UiCardTabs",
    props: {
      modelValue: { type: String, default: "" },
    },
    emits: ["update:modelValue"],
  },
);
