// @vitest-environment happy-dom

import type { MenuOption } from "naive-ui";
import { createPinia, setActivePinia } from "pinia";
import {
  createApp,
  defineComponent,
  nextTick,
  reactive,
  type App,
  type VNodeChild,
} from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "vue-i18n";

import { AdminShell } from "../src/components/admin-shell";
import { useAdminShell } from "../src/components/use-admin-shell";
import type {
  AdminShellDestination,
  AdminShellNavigation,
  AdminShellNavigationResult,
  AdminShellTabNavigationResolver,
} from "../src/components/admin-shell";
import { useAdminAuthStore } from "../src/stores/auth";
import { useAdminShellPreferencesStore } from "../src/stores/shell-preferences";
import { useAdminShellNavigationStore } from "../src/stores/navigation";
import { useAdminShellMenuStore } from "../src/stores/menu";

/** Exercises descendant access to the nearest provided AdminShell context. */
const ShellContextConsumer = defineComponent(
  /**
   * Resolves shell context during descendant setup and renders its public keys and action.
   *
   * @returns A render function exposing the context keys and one destination request button.
   */
  () => {
    /** Retains the nearest shell's public descendant context. */
    const shell = useAdminShell();
    return () => (
      <section>
        <span data-shell-context-keys="">
          {Object.keys(shell).sort().join(",")}
        </span>
        <button
          data-shell-navigate=""
          onClick={() => void shell.navigate({ navKey: "settings" })}
        />
      </section>
    );
  },
  { name: "ShellContextConsumer" },
);
/** Retains mounted apps until cleanup prevents DOM and Pinia state leakage between tests. */
const mountedApps: App[] = [];

/** Installs one shared global Composer so package components resolve i18n in tests. */
const testI18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages: {
    en: { tabs: { home: "Home tab" } },
    "zh-CN": { tabs: { home: "中文首页" } },
  },
});

/**
 * Unmounts every mounted application and clears the happy-dom document.
 *
 * @returns Nothing after test-owned browser state is removed.
 */
function cleanMountedApps(): void {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
  testI18n.global.locale.value = "en";
}

afterEach(cleanMountedApps);

/**
 * Mounts AdminShell with an initialized Pinia store, configured auth store,
 * and caller-owned synthetic slots, so each test can observe only the intended
 * public content seam.
 *
 * @param options - Optional opaque menu, navigation adapter, and synthetic slots.
 * @returns The mounted application container.
 */
function mountShell(
  options: {
    menuOptions?: MenuOption[];
    navigation?: AdminShellNavigation;
    content?: string;
    defaultSlot?: (controls: {
      navigate: (
        destination: AdminShellDestination,
        resolveTabNavigation?: AdminShellTabNavigationResolver,
      ) => Promise<void>;
    }) => VNodeChild;
    sidebarContent?: string;
    tabbarContent?: string;
  } = {},
): HTMLElement {
  const target = document.createElement("div");
  document.body.append(target);
  const pinia = createPinia();
  setActivePinia(pinia);
  if (options.menuOptions) {
    useAdminShellMenuStore().configure(options.menuOptions);
  }
  if (options.navigation) {
    useAdminShellNavigationStore().configure(options.navigation);
  }
  // Configure auth store for authenticated context
  useAdminAuthStore().configure({
    login: vi.fn(() => Promise.resolve({})),
    restore: () => Promise.resolve({ kind: "anonymous" }),
    logout: vi.fn(),
  });
  // Set status to authenticated since shell now always renders layout
  const auth = useAdminAuthStore();
  (auth as unknown as Record<string, unknown>).status = {
    kind: "authenticated",
    userLabel: "Ada",
  };
  /** Deliberately passes non-default slots to prove that AdminShell ignores them. */
  const slots = {
    default:
      options.defaultSlot ??
      (options.content ? () => <div data-slot={options.content} /> : undefined),
    sidebar: options.sidebarContent
      ? () => <div data-slot={options.sidebarContent} />
      : undefined,
    tabbar: options.tabbarContent
      ? () => <div data-slot={options.tabbarContent} />
      : undefined,
  };
  const app = createApp({
    setup: () => () => <AdminShell v-slots={slots} />,
  });
  app.use(pinia);
  app.use(testI18n);
  app.mount(target);
  mountedApps.push(app);
  return target;
}

/**
 * Flushes promise continuations and Vue rendering after an async UI action.
 *
 * @returns A promise that resolves after the observable DOM is up to date.
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await nextTick();
}

/**
 * Finds the close control rendered by a closable Naive UI tab.
 *
 * @param container - Mounted shell DOM containing the tab strip.
 * @param key - Stable local tab key whose close control is needed.
 * @returns The native `NTabs` close control, or null for a nonclosable tab.
 */
function getTabClose(
  container: ParentNode,
  key: string,
): HTMLButtonElement | null {
  return container.querySelector<HTMLButtonElement>(
    `[data-admin-tab-key="${key}"] .n-tabs-tab__close`,
  );
}

/**
 * Opens a hover-triggered Naive dropdown and selects one visible popup-layer option.
 *
 * @param trigger - The button that owns the dropdown to open.
 * @param label - The exact label of the option to select.
 * @returns A promise that resolves after the option body emits a click event.
 */
async function selectDropdownOption(
  trigger: HTMLElement,
  label: string,
): Promise<void> {
  trigger.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
  await settle();
  const option = [
    ...document.body.querySelectorAll(".n-dropdown-option-body"),
  ].find((el) => el.textContent === label);
  if (!option) throw new Error(`Dropdown option "${label}" not found.`);
  option.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await settle();
}

describe("AdminShell", () => {
  it("renders the authenticated shell layout", () => {
    const container = mountShell({
      content: "shell-content",
      menuOptions: [{ key: "home", label: "Home" }],
    });

    expect(container.querySelector(".h-dvh")).not.toBeNull();
    expect(container.querySelector(".n-pro-layout")).not.toBeNull();
    expect(
      container.querySelector('[data-slot="shell-content"]'),
    ).not.toBeNull();
    expect(container.querySelector(".n-menu")).not.toBeNull();
  });

  it("does not render a sidebar menu when menu input is absent or empty", () => {
    const withoutMenu = mountShell();
    const withEmptyMenu = mountShell({ menuOptions: [] });

    expect(withoutMenu.querySelector(".n-menu")).toBeNull();
    expect(withEmptyMenu.querySelector(".n-menu")).toBeNull();
    expect(
      withoutMenu.querySelector(".n-pro-layout__aside--hidden"),
    ).not.toBeNull();
    expect(
      withEmptyMenu.querySelector(".n-pro-layout__aside--hidden"),
    ).not.toBeNull();
  });

  it("composes authenticated content, unchanged menu options, and preference controls", async () => {
    const menuOptions: MenuOption[] = [
      {
        key: "group",
        type: "group",
        label: "Workspace",
        children: [
          {
            key: "home",
            label: () => (
              <a href="/home" data-menu-link="home">
                Home
              </a>
            ),
          },
        ],
      },
    ];
    const container = mountShell({
      content: "router-view",
      menuOptions,
      sidebarContent: "outside-sidebar",
      tabbarContent: "outside-tabbar",
    });

    expect(container.querySelector(".h-dvh")).not.toBeNull();
    expect(container.querySelector(".n-pro-layout")).not.toBeNull();
    expect(container.querySelector('[data-slot="router-view"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="outside-sidebar"]')).toBeNull();
    expect(container.querySelector('[data-slot="outside-tabbar"]')).toBeNull();
    expect(container.querySelector('[data-menu-link="home"]')).not.toBeNull();
    expect(container.textContent).toContain("Ada");
    expect(container.querySelector("[data-admin-tabs]")).toBeNull();

    expect(container.querySelector("[data-admin-nav-left]")).not.toBeNull();
    const account = container.querySelector<HTMLElement>(
      '[data-admin-control="account"]',
    );
    expect(account?.classList).toContain("n-button");
    expect(account?.textContent).toContain("Ada");
    expect(account?.querySelector("svg")).not.toBeNull();

    expect(container.querySelectorAll("select")).toHaveLength(0);
    const preferences = useAdminShellPreferencesStore();

    const theme = container.querySelector<HTMLElement>(
      '[data-admin-control="theme-mode"]',
    );
    expect(theme?.classList).toContain("n-button");
    expect(theme?.querySelector("svg")).not.toBeNull();
    expect(theme?.getAttribute("data-admin-theme-action")).toBe("enter-dark");
    expect(theme?.getAttribute("aria-label")).toBe("Switch to dark theme");
    theme?.click();
    await settle();
    expect(preferences.themeMode).toBe("dark");
    expect(theme?.getAttribute("data-admin-theme-action")).toBe("exit-dark");
    expect(theme?.getAttribute("aria-label")).toBe("Switch to light theme");
    theme?.click();
    await settle();
    expect(preferences.themeMode).toBe("light");
    expect(theme?.getAttribute("data-admin-theme-action")).toBe("enter-dark");

    const fontSize = container.querySelector<HTMLElement>(
      '[data-admin-control="font-size"]',
    );
    await selectDropdownOption(fontSize!, "Large");
    expect(preferences.fontSize).toBe("large");

    const locale = container.querySelector<HTMLButtonElement>(
      '[data-admin-control="locale"]',
    );
    expect(locale?.disabled).toBe(true);
    preferences.setAvailableLocales([
      { key: "en", label: "English" },
      { key: "fr", label: "Français" },
    ]);
    await settle();
    expect(locale?.disabled).toBe(false);
    await selectDropdownOption(locale!, "Français");
    expect(preferences.locale).toBe("fr");

    const sidebarButton = container.querySelector<HTMLButtonElement>(
      '[data-admin-control="sidebar"]',
    );
    expect(sidebarButton?.classList).toContain("n-button");
    sidebarButton!.click();
    await settle();
    expect(preferences.sidebarCollapsed).toBe(true);
    expect(sidebarButton?.getAttribute("aria-pressed")).toBe("true");

    // Verify logout calls the auth store's logout action
    const auth = useAdminAuthStore();
    const logoutSpy = vi.spyOn(auth, "logout");
    await selectDropdownOption(account!, "Sign out");
    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });

  it("synchronizes the preference locale one way into the global Composer", async () => {
    const container = mountShell({ content: "router-view" });
    const preferences = useAdminShellPreferencesStore();

    expect(testI18n.global.locale.value).toBe("en");
    preferences.setLocale("zh-CN");
    await settle();

    // The AdminShell watcher mirrors the store locale into the host Composer.
    expect(testI18n.global.locale.value).toBe("zh-CN");
    // The shell's own local Composer follows the global locale reactively.
    const fontSize = container.querySelector<HTMLElement>(
      '[data-admin-control="font-size"]',
    );
    expect(fontSize?.getAttribute("aria-label")).toBe("字号：中");
  });

  it("resolves i18n-kind tab labels reactively against the global Composer", async () => {
    const home = {
      id: "home",
      nav: { navKey: "home" },
      label: { kind: "i18n", key: "tabs.home" } as const,
      closable: false,
    };
    const navigation = reactive<AdminShellNavigation>({
      active: home,
      handleNavigation: vi.fn(async (request) => ({
        active:
          request.kind === "open"
            ? {
                ...request.candidate,
                label: { kind: "string", value: "New report" } as const,
              }
            : {
                ...request.destination,
                label: { kind: "string", value: "Persisted label" } as const,
              },
      })),
    });
    const container = mountShell({ navigation });
    await settle();

    const tab = container.querySelector("[data-admin-tab-key=home]");
    expect(tab?.textContent).toContain("Home tab");

    // A locale switch re-renders the open tab through the global Composer.
    useAdminShellPreferencesStore().setLocale("zh-CN");
    await settle();
    expect(tab?.textContent).toContain("中文首页");

    // An adapter round-trip returns a string-kind label; the shell re-renders
    // it verbatim while i18n-kind labels keep resolving reactively.
    navigation.active = {
      ...home,
      label: { kind: "string", value: "Persisted label" } as const,
    };
    await settle();
    expect(tab?.textContent).toContain("Persisted label");
  });

  it("provides only navigation control to descendants", async () => {
    const home = {
      id: "home",
      nav: { navKey: "home" },
      label: { kind: "string", value: "Home" } as const,
    };
    const navigation = reactive<AdminShellNavigation>({
      active: home,
      handleNavigation: vi.fn(async (request) => ({
        active:
          request.kind === "open"
            ? {
                id: request.candidate.id,
                nav: request.candidate.nav,
                label: { kind: "string", value: "Settings" } as const,
              }
            : null,
      })),
    });
    const container = mountShell({
      navigation,
      defaultSlot: () => <ShellContextConsumer />,
    });
    await settle();
    expect(
      container.querySelector("[data-shell-context-keys]")?.textContent,
    ).toBe(
      "activateTab,canActivateTab,closeTab,navigate,tabError,tabs,visibleTabs",
    );
    container
      .querySelector<HTMLButtonElement>("[data-shell-navigate]")!
      .click();
    await settle();
    const request = vi
      .mocked(navigation.handleNavigation)
      .mock.calls.at(-1)?.[0];
    expect(request?.kind).toBe("open");
    if (request?.kind !== "open") throw new Error("Expected open request.");
    expect(request.candidate.nav).toEqual({ navKey: "settings" });
    expect(request.current).toEqual(home);
  });

  it("isolates descendant context between concurrently mounted shells", async () => {
    const firstNavigation: AdminShellNavigation = {
      active: {
        id: "first",
        nav: { navKey: "first" },
        label: { kind: "string", value: "First" } as const,
      },
      handleNavigation: vi.fn(async () => ({ active: null })),
    };
    const secondNavigation: AdminShellNavigation = {
      active: {
        id: "second",
        nav: { navKey: "second" },
        label: { kind: "string", value: "Second" } as const,
      },
      handleNavigation: vi.fn(async () => ({ active: null })),
    };
    const first = mountShell({
      navigation: firstNavigation,
      defaultSlot: () => <ShellContextConsumer />,
    });
    const second = mountShell({
      navigation: secondNavigation,
      defaultSlot: () => <ShellContextConsumer />,
    });
    await settle();
    expect(first.querySelector("[data-shell-context-keys]")?.textContent).toBe(
      "activateTab,canActivateTab,closeTab,navigate,tabError,tabs,visibleTabs",
    );
    expect(
      second.querySelector("[data-shell-context-keys]")?.textContent,
    ).toBe(
      "activateTab,canActivateTab,closeTab,navigate,tabError,tabs,visibleTabs",
    );
    second.querySelector<HTMLButtonElement>("[data-shell-navigate]")!.click();
    await settle();
    expect(firstNavigation.handleNavigation).not.toHaveBeenCalled();
    expect(secondNavigation.handleNavigation).toHaveBeenCalledOnce();
  });

  it("commits a menu open candidate only after host confirmation", async () => {
    let resolveOpen:
      | ((value: { active: AdminShellNavigation["active"] }) => void)
      | undefined;
    const home = {
      id: "home-1",
      nav: { navKey: "home" },
      label: { kind: "string", value: "Home" } as const,
      closable: false,
    };
    const navigation = reactive<AdminShellNavigation>({
      active: home,
      handleNavigation: vi.fn(
        () =>
          new Promise<AdminShellNavigationResult>((resolve) => {
            resolveOpen = resolve;
          }),
      ),
    });
    const container = mountShell({
      menuOptions: [
        { key: "home", label: "Home" },
        { key: "settings", label: "Settings" },
      ],
      navigation,
    });
    await settle();
    [...container.querySelectorAll<HTMLElement>(".n-menu-item-content")]
      .find((item) => item.textContent?.includes("Settings"))!
      .click();
    await settle();
    const request = vi.mocked(navigation.handleNavigation).mock.calls[0]![0];
    expect(request.kind).toBe("open");
    if (request.kind !== "open") throw new Error("Expected open request.");
    expect(request.candidate.nav).toEqual({ navKey: "settings" });
    expect(request.current).toEqual(home);
    expect(container.querySelectorAll("[data-admin-tab-key]")).toHaveLength(1);
    const confirmed = {
      id: request.candidate.id,
      nav: request.candidate.nav,
      label: { kind: "string", value: "Settings" } as const,
      closable: true,
    };
    navigation.active = confirmed;
    resolveOpen!({ active: confirmed });
    await settle();
    expect(
      container.querySelector(`[data-admin-tab-key="${confirmed.id}"]`),
    ).not.toBeNull();
  });

  it("does not commit a rejected open candidate", async () => {
    const navigation: AdminShellNavigation = {
      active: {
        id: "home-1",
        nav: { navKey: "home" },
        label: { kind: "string", value: "Home" } as const,
      },
      handleNavigation: vi.fn(async () => {
        throw new Error("private failure");
      }),
    };
    const container = mountShell({
      menuOptions: [{ key: "settings", label: "Settings" }],
      navigation,
    });
    await settle();
    container.querySelector<HTMLElement>(".n-menu-item-content")!.click();
    await settle();
    await settle();
    expect(container.querySelectorAll("[data-admin-tab-key]")).toHaveLength(1);
    expect(container.textContent).toContain("Unable to navigate");
    expect(container.textContent).not.toContain("private failure");
  });

  it("activates the newest committed tab with an equal destination", async () => {
    const home = {
      id: "home",
      nav: { navKey: "home" },
      label: { kind: "string", value: "Home" } as const,
    };
    const older = {
      id: "report-1",
      nav: { navKey: "reports" },
      label: { kind: "string", value: "Report 1" } as const,
    };
    const newer = {
      id: "report-2",
      nav: { navKey: "reports" },
      label: { kind: "string", value: "Report 2" } as const,
    };
    const navigation = reactive<AdminShellNavigation>({
      active: home,
      handleNavigation: vi.fn(async (request) => {
        const active = request.kind === "open" ? null : request.destination;
        navigation.active = active;
        return { active };
      }),
    });
    const container = mountShell({
      menuOptions: [{ key: "reports", label: "Reports" }],
      navigation,
    });
    await settle();
    navigation.active = older;
    await settle();
    navigation.active = newer;
    await settle();
    navigation.active = home;
    await settle();
    container.querySelector<HTMLElement>(".n-menu-item-content")!.click();
    await settle();
    expect(navigation.handleNavigation).toHaveBeenLastCalledWith({
      kind: "activate",
      destination: newer,
      current: home,
    });
  });

  it("opens a new page instance when the committed destination payload differs", async () => {
    const home = {
      id: "home",
      nav: { navKey: "home" },
      label: { kind: "string", value: "Home" } as const,
    };
    const first = {
      id: "report-1",
      nav: { navKey: "reports", payload: { id: 1 } },
      label: { kind: "string", value: "Report 1" } as const,
    };
    const second = {
      id: "report-2",
      nav: { navKey: "reports", payload: { id: 2 } },
      label: { kind: "string", value: "Report 2" } as const,
    };
    const navigation = reactive<AdminShellNavigation>({
      active: home,
      handleNavigation: vi.fn(async (request) => {
        const active = request.kind === "open" ? null : request.destination;
        navigation.active = active;
        return { active };
      }),
    });
    const container = mountShell({
      menuOptions: [{ key: "reports", label: "Reports" }],
      navigation,
    });
    await settle();
    navigation.active = first;
    await settle();
    navigation.active = second;
    await settle();
    navigation.active = home;
    await settle();
    // The menu destination carries no payload, so neither payload-bearing
    // report tab is the same page — the request opens a fresh instance.
    container.querySelector<HTMLElement>(".n-menu-item-content")!.click();
    await settle();
    expect(navigation.handleNavigation).toHaveBeenLastCalledWith({
      kind: "open",
      candidate: { id: expect.any(String), nav: { navKey: "reports" } },
      current: home,
      closeCurrent: false,
    });
  });

  it("accepts a call-specific resolver without storing it in the destination", async () => {
    const home = {
      id: "home",
      nav: { navKey: "home" },
      label: { kind: "string", value: "Home" } as const,
    };
    const report = {
      id: "report-1",
      nav: { navKey: "reports" },
      label: { kind: "string", value: "Report" } as const,
    };
    const navigation = reactive<AdminShellNavigation>({
      active: home,
      handleNavigation: vi.fn(async (request) => ({
        active:
          request.kind === "open"
            ? {
                ...request.candidate,
                label: { kind: "string", value: "New report" } as const,
              }
            : request.destination,
      })),
    });
    const resolver = vi.fn(() => ({ kind: "open" as const }));
    const container = mountShell({
      navigation,
      defaultSlot: ({ navigate }) => (
        <button
          data-open-report=""
          onClick={() => void navigate({ navKey: "reports" }, resolver)}
        />
      ),
    });
    await settle();
    navigation.active = report;
    await settle();
    navigation.active = home;
    await settle();
    container.querySelector<HTMLElement>("[data-open-report]")!.click();
    await settle();
    expect(resolver).toHaveBeenCalledWith([home, report], {
      navKey: "reports",
    });
    expect(
      vi.mocked(navigation.handleNavigation).mock.calls.at(-1)?.[0].kind,
    ).toBe("open");
  });

  it("keeps duplicate destinations as independently closable page instances", async () => {
    const first = {
      id: "same-1",
      nav: { navKey: "reports", payload: { id: 1 } },
      label: { kind: "string", value: "First" } as const,
      closable: true,
    };
    const second = {
      id: "same-2",
      nav: { navKey: "reports", payload: { id: 1 } },
      label: { kind: "string", value: "Second" } as const,
      closable: true,
    };
    const navigation = reactive<AdminShellNavigation>({
      active: first,
      handleNavigation: vi.fn(async (request) => ({
        active:
          request.kind === "close"
            ? request.destination
            : request.kind === "open"
              ? null
              : request.destination,
      })),
    });
    const container = mountShell({ navigation });
    await settle();
    navigation.active = second;
    await settle();
    getTabClose(container, "same-1")!.click();
    await settle();
    expect(navigation.handleNavigation).toHaveBeenLastCalledWith({
      kind: "close",
      closing: first,
      destination: second,
    });
    expect(container.querySelector('[data-admin-tab-key="same-1"]')).toBeNull();
    expect(
      container.querySelector('[data-admin-tab-key="same-2"]'),
    ).not.toBeNull();
  });

  it("heals a revived closed tab onto the committed instance of the same destination", async () => {
    const home = {
      id: "home",
      nav: { navKey: "home" },
      label: { kind: "string", value: "Home" } as const,
      closable: false,
    };
    const closed = {
      id: "settings-1",
      nav: { navKey: "settings" },
      label: { kind: "string", value: "Settings" } as const,
      closable: true,
    };
    const committed = {
      id: "settings-2",
      nav: { navKey: "settings" },
      label: { kind: "string", value: "Settings" } as const,
      closable: true,
    };
    const navigation = reactive<AdminShellNavigation>({
      active: home,
      handleNavigation: vi.fn(async (request) => {
        // The adapter contract: close navigates to the fallback; heal
        // restamps the current entry and leaves the committed tab active.
        const active =
          request.kind === "close"
            ? request.destination
            : request.kind === "heal"
              ? request.destination
              : null;
        navigation.active = active;
        return { active };
      }),
    });
    const container = mountShell({ navigation });
    await settle();
    navigation.active = closed;
    await settle();
    navigation.active = committed;
    await settle();
    // Close the first settings instance; the committed one remains.
    getTabClose(container, "settings-1")!.click();
    await settle();
    expect(container.querySelector('[data-admin-tab-key="settings-1"]')).toBeNull();
    expect(
      container.querySelector('[data-admin-tab-key="settings-2"]'),
    ).not.toBeNull();

    // History traversal revives the closed instance — the shell must heal the
    // stale entry instead of surfacing a duplicate tab.
    navigation.active = closed;
    await settle();
    expect(navigation.handleNavigation).toHaveBeenLastCalledWith({
      kind: "heal",
      destination: expect.objectContaining({ id: "settings-2" }),
      current: closed,
    });
    expect(container.querySelector('[data-admin-tab-key="settings-1"]')).toBeNull();
    const settingsTabs = container.querySelectorAll(
      '[data-admin-tab-key^="settings-"]',
    );
    expect(settingsTabs.length).toBe(1);
    expect(
      container.querySelector('[data-admin-tab-key="settings-2"]'),
    ).not.toBeNull();
  });

  it("records a revived closed tab when no committed instance shares its destination", async () => {
    const home = {
      id: "home",
      nav: { navKey: "home" },
      label: { kind: "string", value: "Home" } as const,
      closable: false,
    };
    const closed = {
      id: "settings-1",
      nav: { navKey: "settings" },
      label: { kind: "string", value: "Settings" } as const,
      closable: true,
    };
    const navigation = reactive<AdminShellNavigation>({
      active: home,
      handleNavigation: vi.fn(async (request) => {
        // The adapter contract: close navigates the router to the fallback,
        // so the confirmed active state moves with the entry.
        const active =
          request.kind === "close" ? request.destination : null;
        navigation.active = active;
        return { active };
      }),
    });
    const container = mountShell({ navigation });
    await settle();
    navigation.active = closed;
    await settle();
    getTabClose(container, "settings-1")!.click();
    await settle();
    expect(container.querySelector('[data-admin-tab-key="settings-1"]')).toBeNull();

    // Back revives the only settings instance — recorded as its own tab
    // (history restore), never healed without a committed match.
    navigation.active = closed;
    await settle();
    expect(navigation.handleNavigation).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "heal" }),
    );
    expect(
      container.querySelector('[data-admin-tab-key="settings-1"]'),
    ).not.toBeNull();
  });

  it("does not heal a revived tab onto a committed instance with a different payload", async () => {
    const home = {
      id: "home",
      nav: { navKey: "home" },
      label: { kind: "string", value: "Home" } as const,
      closable: false,
    };
    const closed = {
      id: "detail-1",
      nav: { navKey: "detail", payload: { reportId: "r-1" } },
      label: { kind: "string", value: "Detail: r-1" } as const,
      closable: true,
    };
    const committed = {
      id: "detail-2",
      nav: { navKey: "detail", payload: { reportId: "r-2" } },
      label: { kind: "string", value: "Detail: r-2" } as const,
      closable: true,
    };
    const navigation = reactive<AdminShellNavigation>({
      active: home,
      handleNavigation: vi.fn(async (request) => {
        const active =
          request.kind === "close" ? request.destination : null;
        navigation.active = active;
        return { active };
      }),
    });
    const container = mountShell({ navigation });
    await settle();
    navigation.active = closed;
    await settle();
    navigation.active = committed;
    await settle();
    getTabClose(container, "detail-1")!.click();
    await settle();
    expect(container.querySelector('[data-admin-tab-key="detail-1"]')).toBeNull();

    // The revived r-1 entry is a different page than the committed r-2
    // instance, so it is recorded as its own tab instead of being healed.
    navigation.active = closed;
    await settle();
    expect(navigation.handleNavigation).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "heal" }),
    );
    const detailTabs = container.querySelectorAll(
      '[data-admin-tab-key^="detail-"]',
    );
    expect(detailTabs.length).toBe(2);
  });

  it("throws when descendant context is requested outside AdminShell", () => {
    // Deliberately last: this mounts an app whose setup throws, which leaves
    // Vue's render-scoped instance global stale for any subsequent functional
    // component render in this suite. Running it last isolates that pollution.
    const target = document.createElement("div");
    document.body.append(target);
    const app = createApp(ShellContextConsumer);
    expect(() => app.mount(target)).toThrow(
      "useAdminShell() requires an ancestor AdminShell.",
    );
  });
});

describe("useAdminShellNavigationStore", () => {
  it("returns null navigation before configuration", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAdminShellNavigationStore();
    expect(store.navigation).toBeNull();
  });

  it("keeps the navigation controller out of serializable Pinia state", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const navigation: AdminShellNavigation = {
      active: {
        id: "home",
        nav: { navKey: "home" },
        label: { kind: "string", value: "Home" } as const,
      },
      handleNavigation: vi.fn(async () => ({ active: null })),
    };

    useAdminShellNavigationStore().configure(navigation);

    expect(pinia.state.value["admin-shell-navigation"]).toEqual({});
  });

  it("configures navigation once per Pinia instance", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAdminShellNavigationStore();
    const first: AdminShellNavigation = {
      active: {
        id: "one",
        nav: { navKey: "one" },
        label: { kind: "string", value: "One" } as const,
      },
      handleNavigation: vi.fn(async () => ({ active: null })),
    };
    store.configure(first);
    expect(store.navigation).toBe(first);
    const second: AdminShellNavigation = {
      active: {
        id: "two",
        nav: { navKey: "two" },
        label: { kind: "string", value: "Two" } as const,
      },
      handleNavigation: vi.fn(async () => ({ active: null })),
    };
    store.configure(second);
    expect(store.navigation).toBe(first);
  });

  it("isolates navigation configuration between Pinia instances", () => {
    const piniaA = createPinia();
    setActivePinia(piniaA);
    const navA: AdminShellNavigation = {
      active: {
        id: "a",
        nav: { navKey: "a" },
        label: { kind: "string", value: "A" } as const,
      },
      handleNavigation: vi.fn(async () => ({ active: null })),
    };
    useAdminShellNavigationStore().configure(navA);

    const piniaB = createPinia();
    setActivePinia(piniaB);
    expect(useAdminShellNavigationStore().navigation).toBeNull();
    const navB: AdminShellNavigation = {
      active: {
        id: "b",
        nav: { navKey: "b" },
        label: { kind: "string", value: "B" } as const,
      },
      handleNavigation: vi.fn(async () => ({ active: null })),
    };
    useAdminShellNavigationStore().configure(navB);
    expect(useAdminShellNavigationStore().navigation).toBe(navB);

    setActivePinia(piniaA);
    expect(useAdminShellNavigationStore().navigation).toBe(navA);
  });

  it("reactively reflects navigation active changes", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const home = {
      id: "home",
      nav: { navKey: "home" },
      label: { kind: "string", value: "Home" } as const,
    };
    const navigation = reactive<AdminShellNavigation>({
      active: home,
      handleNavigation: vi.fn(async () => ({ active: null })),
    });
    useAdminShellNavigationStore().configure(navigation);
    const store = useAdminShellNavigationStore();
    expect(store.navigation!.active).toEqual(home);
    const updated = {
      id: "settings",
      nav: { navKey: "settings" },
      label: { kind: "string", value: "Settings" } as const,
    };
    navigation.active = updated;
    await nextTick();
    expect(store.navigation!.active).toEqual(updated);
  });
});
