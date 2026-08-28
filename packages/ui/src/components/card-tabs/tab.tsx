import {
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
} from "vue";
import { tv } from "tailwind-variants";
import { useUiCssVarsFor } from "../../theme/types";
import { useTabController } from "./runtime";

/** Reserved, non-selectable tab keys for the default head/tail sentinels. */
export const HEAD_TAB_KEY = "__noob-ui-card-tabs-head__";
export const TAIL_TAB_KEY = "__noob-ui-card-tabs-tail__";

type TabMode = "tab" | "head" | "tail";

/** Which side carries the fillet cut-out on the bottom segment. */
type Neighbor = "none" | "left" | "right";

type Props = {
  tabKey: string;
  mode?: TabMode;
};

/**
 * One connected tab-bar scope. Rendered inside a `Tabs` grid container as
 * a `grid-cols-subgrid grid-rows-subgrid` card placed at
 * `--noob-ui-card-tabs-col-start` (4·index+1), spanning 5 rows.
 *
 * The class matrix is organized with `tailwind-variants` across three axes:
 * `status` (active/inactive), `mode` (tab/head/tail), and `neighbor`
 * (fillet side on the bottom segment). Conditional children (body pill,
 * active-tab border, bottom segment) follow the demo's card anatomy.
 *
 * Registers itself with the shared `TabController` on mount (supplying its root
 * element for DOM ordering) and unregisters on unmount, keeping `tabList` and
 * the container's scope count correct. Its grid position comes from the
 * `index`/`count` the parent injects (not the controller's sorted array), so
 * open/close reorders never misplace a tab on the bar.
 */
export const Tab = defineComponent(
  (props: Props, { slots }: { slots: { default?: () => unknown } }) => {
    const { tabs, controller } = useTabController()!;
    const rootEl = ref<HTMLElement | null>(null);

    // NOTE: `defineOptions` is not part of the vue-jsx-vapor macro set (left
    // bare in the output, crashes at setup); the name comes from the fn name.
    const { $css, $tw } = useUiCssVarsFor("CardTabs");
    const styles = tv({
      slots: {
        outer: [
          "grid",
          "grid-cols-subgrid",
          "grid-rows-subgrid",
          "col-span-5",
          "row-span-full",
          $tw("col-start-(--noob-ui-card-tabs-col-start)"),
          $tw("row-start-(--noob-ui-card-tabs-row-start)"),
          "before:content-['']",
        ],
        body: [
          "z-30",
          "col-start-2",
          "-col-end-2",
          "row-start-2",
          "-row-end-2",
          "flex",
          "items-center",
          "justify-center",
          "min-w-0",
          "overflow-hidden",
          "transition-colors",
          "duration-200",
          $tw("rounded-t-(--noob-ui-card-tabs-inner-radii-top)"),
          $tw("rounded-b-(--noob-ui-card-tabs-inner-radii-bottom)"),
          $tw<"px">("px-(--noob-ui-card-tabs-content-padding-x)"),
          $tw<"pt">("pt-(--noob-ui-card-tabs-content-padding-top)"),
          $tw<"pb">("pb-(--noob-ui-card-tabs-content-padding-bottom)"),
        ],
      },
      variants: {
        status: {
          active: {
            outer: [
              "z-20",
              "bg-transparent!",
              "before:z-11",
              "before:col-start-2",
              "before:-col-end-2",
              "before:row-start-2",
              "before:-row-end-3",
              $tw("before:rounded-t-(--noob-ui-card-tabs-inner-radii-top)"),
              "before:outline-1",
              $tw("before:outline-(--noob-ui-card-tabs-border-color)"),
            ],
            body: [
              $tw("bg-(--noob-ui-card-tabs-active-card-color)"),
              $tw("text-(--noob-ui-card-tabs-active-card-text-color)"),
            ],
          },
          inactive: {
            outer: [
              "z-10",
              $tw("bg-(--noob-ui-card-tabs-background-color)"),
              "before:border-b",
              "before:col-span-full",
              "before:-row-start-3",
              "before:row-span-2",
              $tw("before:border-(--noob-ui-card-tabs-border-color)"),
            ],
            body: [$tw("text-(--noob-ui-card-tabs-inactive-card-text-color)")],
          },
        },
        mode: {
          // Interactive affordances only on real tabs (sentinels are inert).
          tab: {
            outer: [
              "cursor-pointer",
              "select-none",
              "focus-visible:outline-2",
              $tw("focus-visible:outline-(--noob-ui-card-tabs-border-color)"),
            ],
          },
          head: {},
          tail: {},
        },
        neighbor: {
          none: {},
          left: {},
          right: {},
        },
      },
      compoundVariants: [
        {
          neighbor: "left",
          status: "inactive",
          class: {
            outer: [
              $tw("rounded-br-(--noob-ui-card-tabs-fillet-radii)"),
              $tw("before:rounded-br-(--noob-ui-card-tabs-fillet-radii)"),
              "before:border-r",
            ],
          },
        },
        {
          neighbor: "right",
          status: "inactive",
          class: {
            outer: [
              $tw("rounded-bl-(--noob-ui-card-tabs-fillet-radii)"),
              $tw("before:rounded-bl-(--noob-ui-card-tabs-fillet-radii)"),
              "before:border-l",
            ],
          },
        },
        {
          status: "inactive",
          mode: "tab",
          class: {
            body: [
              $tw("hover:bg-(--noob-ui-card-tabs-card-color-on-hover)"),
              $tw("hover:text-(--noob-ui-card-tabs-card-text-color-on-hover)"),
            ],
          },
        },
      ],
      defaultVariants: {
        status: "inactive",
        mode: "tab",
        neighbor: "none",
      },
    });

    const state = computed(() => {
      const activeKey = toValue(controller.activeKey);
      const mode = props.mode ?? "tab";

      const index = tabs.get(props.tabKey)?.index;
      const activeIndex = tabs.get(activeKey)?.index;

      if (index == null || activeIndex == null) {
        return {};
      }

      let neighbor: Neighbor = "none";

      if (activeIndex === undefined) {
        neighbor = "none";
      } else if (index == activeIndex - 1) {
        neighbor = "left";
      } else if (index == activeIndex + 1) {
        neighbor = "right";
      }

      return {
        status: activeKey === props.tabKey ? "active" : "inactive",
        mode,
        neighbor,
      } satisfies Parameters<typeof styles>[0];
    });

    const colStart = computed(() => {
      const index = tabs.get(props.tabKey)?.index;
      return index == null ? 0 : index >= 0 ? 4 * index + 1 : 1;
    });

    onMounted(() => {
      controller.registerTab({
        key: props.tabKey,
        mode: props.mode ?? "tab",
        instance: rootEl.value!,
      });
    });
    onBeforeUnmount(() => controller.unregisterTab(props.tabKey));

    // NOTE: reactive reads must happen INSIDE the returned JSX — the
    // vue-jsx-vapor compiler hoists setup-level `const`s out of the render
    // effect, so once-computed values (isActive, styles(state.value)) never
    // re-evaluate and the active highlight would stay stale.
    const isActiveTab = computed(
      () => toValue(controller.activeKey) === props.tabKey,
    );
    const tabMode = computed(() => props.mode ?? "tab");

    /**
     * Keyboard support for real tabs (sentinels are inert): Enter/Space open the
     * focused tab; ArrowLeft/ArrowRight activate the adjacent tab in DOM order.
     * Activated neighbors fire the same `handleClick` as mouse clicks, so the
     * parent view-model (and any navigation side effect) behaves identically.
     */
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        controller.handleClick(props.tabKey);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        // Skip the structural head/tail sentinels: arrows only move between
        // real (selectable) tabs.
        const ordered = [...tabs.values()]
          .filter((tab) => tab.mode === "tab")
          .sort((a, b) => a.index - b.index);
        const i = ordered.findIndex((tab) => tab.key === props.tabKey);
        const neighbor = ordered[i + (e.key === "ArrowLeft" ? -1 : 1)];
        if (neighbor) {
          e.preventDefault();
          controller.handleClick(neighbor.key);
          // Roving focus: move keyboard focus to the activated tab so the next
          // Arrow key continues from the new active position. Navigation (URL
          // change) can drop focus to body mid-frame, so re-assert next frame;
          // if the bar remounted, elementOf() returns the detached node and the
          // refocus is a harmless no-op.
          controller.elementOf(neighbor.key)?.focus({ preventScroll: true });
          // Navigation can remount the bar (old node detached): re-resolve the
          // freshly registered element next frame so focus chains across moves,
          // and bring the activated tab into view when the bar is scrollable.
          requestAnimationFrame(() => {
            const el = controller.elementOf(neighbor.key);
            el?.focus({ preventScroll: true });
            el?.scrollIntoView({ block: "nearest", inline: "nearest" });
          });
        }
      }
    };

    return () => (
      <div
        ref={rootEl}
        role={tabMode.value === "tab" ? "tab" : undefined}
        aria-selected={tabMode.value === "tab" ? isActiveTab.value : undefined}
        aria-current={
          tabMode.value === "tab" && isActiveTab.value ? "page" : undefined
        }
        data-card-tab-key={props.tabKey}
        data-card-tab-role={tabMode.value}
        data-admin-tab-key={tabMode.value === "tab" ? props.tabKey : undefined}
        data-admin-tab-active={
          tabMode.value === "tab" && isActiveTab.value ? true : undefined
        }
        // Roving tabindex: only the active tab is a Tab stop; arrows move the
        // active tab and carry focus with it. Sentinels are not focusable.
        tabindex={
          tabMode.value === "tab" ? (isActiveTab.value ? 0 : -1) : undefined
        }
        onKeydown={tabMode.value === "tab" ? onKeydown : undefined}
        style={{
          [$css("--noob-ui-card-tabs-col-start")]: String(colStart.value),
          [$css("--noob-ui-card-tabs-row-start")]: "1",
        }}
        class={styles(state.value).outer()}
        onClick={
          tabMode.value === "tab"
            ? () => {
                controller.handleClick(props.tabKey);
                // Clicking a tab must move focus to it (divs are not focusable
                // on click), otherwise the next Arrow key is swallowed by body.
                rootEl.value?.focus({ preventScroll: true });
                // Activation may navigate and remount the bar (old node
                // detached): re-resolve next frame so keyboard entry survives
                // navigation and the clicked tab stays focused.
                requestAnimationFrame(() => {
                  const el = controller.elementOf(props.tabKey);
                  el?.focus({ preventScroll: true });
                  el?.scrollIntoView({ block: "nearest", inline: "nearest" });
                });
              }
            : undefined
        }>
        {slots.default != null ? (
          <div class={styles(state.value).body()}>{slots.default?.()}</div>
        ) : null}
      </div>
    );
  },
  {
    name: "CardTabsTab",
  },
);
