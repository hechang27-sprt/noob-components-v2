/**
 * Tab controller — manages the connected tab-bar registry.
 *
 * Provides a shared reactive `tabList` and DOM-position-sorted tab map
 * between a `CardTabs.Root` and its `CardTabs.Tab` children via Vue's
 * provide/inject. Handles registration, unregistration, keyboard
 * navigation ordering, and focus management.
 *
 * The controller uses DOM `compareDocumentPosition` to maintain tabs in
 * visual order regardless of mount/unmount sequence. A sorted binary
 * search insertion keeps O(log n) registration for large tab sets.
 */
import {
  inject,
  InjectionKey,
  MaybeRefOrGetter,
  provide,
  reactive,
  readonly,
} from "vue";
import { LIB_ID } from "../../registry";

const CONTROLLER_PROVIDE_KEY: InjectionKey<
  ReturnType<typeof createTabController>
> = Symbol(`${LIB_ID}:UiCardTabs:TabController`);

export type TabDataBase = {
  key: string;
  mode: "tab" | "head" | "tail";
  instance?: Element;
};

export type TabData = TabDataBase & {
  instance: Element;
};

export type StoredTabData = TabDataBase & {
  index: number;
  instance: undefined;
};

export interface CreateTabControllerOptions {
  activeKey: MaybeRefOrGetter<string>;
  handleClick: (tabKey: string) => void;
}

/**
 * Custom Binary Search using a true comparator function.
 * Returns the index of the element if found, or a negative insertion index if not found.
 */
function sortedIndexWithCmp<T>(
  array: readonly T[],
  target: T,
  compareFn: (a: T, b: T) => number,
): number {
  let low = 0;
  let high = array.length - 1;

  while (low <= high) {
    // Bitwise floor division to find the middle index safely
    const mid = (low + high) >> 1;

    const cmp = compareFn(array[mid], target);
    if (cmp == 0) {
      return mid; // Target found, return its current index
    } else if (cmp < 0) {
      low = mid + 1; // Search the right half
    } else {
      high = mid - 1; // Search the left half
    }
  }

  // Target not found; 'low' is now the correct insertion index
  return low;
}

export function useTabController(options?: CreateTabControllerOptions) {
  let controller = inject(CONTROLLER_PROVIDE_KEY, undefined);
  if (controller) return controller;
  else if (!options) throw new Error("No `TabController` provided");

  controller = createTabController(options);
  provide(CONTROLLER_PROVIDE_KEY, controller);
  return controller;
}

function createTabController(options: CreateTabControllerOptions) {
  const { activeKey, handleClick } = options;
  const tabs = reactive(new Map<string, StoredTabData>());
  const elements = new Map<string, Element>();
  // Reactive so consumers reading `tabList.length` / a tab's `index` (e.g. the
  // column template, col-start) re-render as tabs register/unregister.
  const tabList = reactive([] as StoredTabData[]) as StoredTabData[];

  const tabCmp = (lhs: TabDataBase, rhs: TabDataBase) => {
    const lhsEl = lhs.instance ?? elements.get(lhs.key);
    const rhsEl = rhs.instance ?? elements.get(rhs.key);

    if (!lhsEl) throw new Error(`Invalid tabKey: ${lhs.key}`);
    if (!rhsEl) throw new Error(`Invalid tabKey: ${rhs.key}`);

    if (lhsEl === rhsEl) return 0;
    else if (
      lhsEl.compareDocumentPosition(rhsEl) & Node.DOCUMENT_POSITION_FOLLOWING
    )
      return -1;
    else return 1;
  };

  const controller = {
    activeKey,
    handleClick,
    registerTab(target: TabData): void {
      if (tabs.has(target.key)) {
        throw new Error(`Duplicate tab key: ${target.key}`);
      }

      // Track the live element so `tabCmp` can order by DOM position even
      // though the stored descriptors keep `instance: undefined`.
      elements.set(target.key, target.instance);

      let index;
      // greedily check the most common cases
      if (tabList.length == 0 || tabCmp(target, tabList.at(-1)!) >= 0) {
        index = tabList.length;
      } else if (tabCmp(target, tabList.at(-2)!) >= 0) {
        index = tabList.length - 1;
      } else {
        index = sortedIndexWithCmp(tabList, target, tabCmp);
      }

      const tab: StoredTabData = {
        ...target,
        index,
        instance: undefined,
      };

      for (const tabAfter of tabList.slice(index)) {
        tabAfter.index += 1;
      }
      tabList.splice(index, 0, tab);

      tabs.set(tab.key, tab);
    },
    /** Returns the live DOM element of a registered tab (for focus moves). */
    elementOf(tabKey: string): HTMLElement | undefined {
      return elements.get(tabKey) as HTMLElement | undefined;
    },
    unregisterTab(tabKey: string): void {
      const toRemove = tabs.get(tabKey);
      if (!toRemove) {
        console.warn(`Tab key doesn't exist: ${tabKey}`);
        return;
      }

      tabList.splice(toRemove.index, 1);
      for (const tabAfter of tabList.slice(toRemove.index)) {
        tabAfter.index -= 1;
      }
      tabs.delete(tabKey);
      elements.delete(tabKey);
    },
  };

  return { tabs: readonly(tabs), tabList: readonly(tabList), controller };
}
