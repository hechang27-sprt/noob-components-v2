// @vitest-environment happy-dom

import type { MenuOption } from "naive-ui";
import { createPinia, setActivePinia } from "pinia";
import { createApp, h, nextTick, reactive, type App } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminShell } from "../src/components/admin-shell";
import type { AdminShellTabController } from "../src/components/admin-shell";
import type {
  AdminAuthActions,
  AdminAuthStatus,
} from "../src/runtime-contract";
import { useAdminShellPreferencesStore } from "../src/stores/shell-preferences";

/** Retains mounted apps until cleanup prevents DOM and Pinia state leakage between tests. */
const mountedApps: App[] = [];

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
}

afterEach(cleanMountedApps);

/**
 * Mounts AdminShell with an initialized Pinia store and caller-owned synthetic
 * slots, so each test can observe only the intended public content seam.
 *
 * @param authStatus - Frontend auth state supplied to the shell.
 * @param authActions - Starter-owned login/logout callbacks.
 * @param options - Optional opaque menu, tab controller, and synthetic slots.
 * @returns The mounted application container.
 */
function mountShell(
  authStatus: AdminAuthStatus,
  authActions: AdminAuthActions,
  options: {
    menuOptions?: MenuOption[];
    tabController?: AdminShellTabController;
    content?: string;
    sidebarContent?: string;
    tabbarContent?: string;
  } = {},
): HTMLElement {
  const target = document.createElement("div");
  document.body.append(target);
  const pinia = createPinia();
  setActivePinia(pinia);
  const preferences = useAdminShellPreferencesStore();
  preferences.initialize();
  /** Deliberately passes non-default slots to prove that AdminShell ignores them. */
  const slots = {
    default: options.content
      ? () => h("div", { "data-slot": options.content })
      : undefined,
    sidebar: options.sidebarContent
      ? () => h("div", { "data-slot": options.sidebarContent })
      : undefined,
    tabbar: options.tabbarContent
      ? () => h("div", { "data-slot": options.tabbarContent })
      : undefined,
  };
  const app = createApp({
    setup: () => () =>
      h(
        AdminShell,
        {
          authStatus,
          authActions,
          menuOptions: options.menuOptions,
          tabController: options.tabController,
        },
        slots,
      ),
  });
  app.use(pinia);
  app.mount(target);
  mountedApps.push(app);
  return target;
}

/**
 * Creates the minimal frontend-only auth callback contract used by shell tests.
 *
 * @returns Login and logout spies with no backend coupling.
 */
function createAuthActions(): AdminAuthActions {
  return { login: vi.fn(), logout: vi.fn() };
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
 * @returns A promise that resolves after option selection and Vue rendering settle.
 */
async function selectDropdownOption(
  trigger: HTMLElement,
  label: string,
): Promise<void> {
  trigger.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
  await settle();
  const option = [
    ...document.querySelectorAll<HTMLElement>(".n-dropdown-option-body__label"),
  ]
    .find((element) => element.textContent === label)
    ?.closest<HTMLElement>(".n-dropdown-option-body");

  expect(option).toBeTruthy();
  option!.click();
  await settle();
}

describe("AdminShell", () => {
  it("renders an isolated loading layout without authenticated content", () => {
    const container = mountShell({ kind: "loading" }, createAuthActions(), {
      content: "loading-content",
      menuOptions: [{ key: "loading", label: "Should not render" }],
    });

    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="loading-content"]')).toBeNull();
    expect(container.querySelector(".n-pro-layout")).toBeNull();
    expect(container.textContent).not.toContain("Should not render");
  });

  it("delegates anonymous rendering to AdminLoginPage without shell content", () => {
    const authActions = createAuthActions();
    const container = mountShell({ kind: "anonymous" }, authActions, {
      content: "anonymous-content",
      menuOptions: [{ key: "anonymous", label: "Should not render" }],
    });

    expect(container.textContent).toContain("Sign in");
    expect(container.querySelector("form")).not.toBeNull();
    expect(
      container.querySelector('[data-slot="anonymous-content"]'),
    ).toBeNull();
    expect(container.querySelector(".n-pro-layout")).toBeNull();
    expect(container.textContent).not.toContain("Should not render");
  });

  it("does not render a sidebar menu when menu input is absent or empty", () => {
    const withoutMenu = mountShell(
      { kind: "authenticated" },
      createAuthActions(),
    );
    const withEmptyMenu = mountShell(
      { kind: "authenticated" },
      createAuthActions(),
      { menuOptions: [] },
    );

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
            label: () =>
              h("a", { href: "/home", "data-menu-link": "home" }, "Home"),
          },
        ],
      },
    ];
    const authActions = createAuthActions();
    const container = mountShell(
      { kind: "authenticated", userLabel: "Ada" },
      authActions,
      {
        content: "router-view",
        menuOptions,
        sidebarContent: "outside-sidebar",
        tabbarContent: "outside-tabbar",
      },
    );

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

    await selectDropdownOption(account!, "Sign out");
    expect(authActions.logout).toHaveBeenCalledTimes(1);
  });

  it("synchronizes menu highlight after tab-driven navigation", async () => {
    const descriptors: Record<string, AdminShellTabController["current"]> = {
      home: { key: "home", label: "Home", closable: false },
      settings: { key: "settings", label: "Settings", closable: true },
    };
    const controller = reactive({
      current: descriptors.home,
      activate: vi.fn(async (key: string) => {
        controller.current = descriptors[key] ?? null;
      }),
      close: vi.fn(async () => undefined),
    });
    const menuOptions: MenuOption[] = [
      {
        key: "home",
        label: () =>
          h(
            "button",
            {
              type: "button",
              "data-menu-target": "home",
              onClick: () => {
                controller.current = descriptors.home;
              },
            },
            "Home",
          ),
      },
      {
        key: "settings",
        label: () =>
          h(
            "button",
            {
              type: "button",
              "data-menu-target": "settings",
              onClick: () => {
                controller.current = descriptors.settings;
              },
            },
            "Settings",
          ),
      },
    ];
    const container = mountShell(
      { kind: "authenticated" },
      createAuthActions(),
      { menuOptions, tabController: controller },
    );
    await settle();

    container
      .querySelector<HTMLElement>('[data-menu-target="settings"]')!
      .click();
    await settle();
    expect(container.querySelector(".n-menu-item-content--selected")?.textContent).toContain(
      "Settings",
    );

    container
      .querySelector<HTMLElement>('[data-admin-tab-key="home"]')!
      .click();
    await settle();
    expect(controller.activate).toHaveBeenCalledWith("home");
    expect(container.querySelector(".n-menu-item-content--selected")?.textContent).toContain(
      "Home",
    );
  });

  it("contains rejected logout actions as visible local feedback", async () => {
    const authActions: AdminAuthActions = {
      login: vi.fn(),
      logout: vi.fn(async () => {
        throw new Error("logout failed");
      }),
    };
    const container = mountShell({ kind: "authenticated" }, authActions);
    const account = container.querySelector<HTMLElement>(
      '[data-admin-control="account"]',
    );

    await selectDropdownOption(account!, "Sign out");

    expect(authActions.logout).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector("[data-admin-logout-error]")?.textContent,
    ).toBe("Unable to sign out.");
    expect(
      container.querySelector<HTMLButtonElement>(
        '[data-admin-control="account"]',
      )?.disabled,
    ).toBe(false);
  });

  it("renders host-owned tabs through NTabs without reactivating the active tab", async () => {
    const controller: AdminShellTabController = {
      current: { key: "home", label: "Home", closable: false },
      activate: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    };
    const container = mountShell(
      { kind: "authenticated" },
      createAuthActions(),
      { tabController: controller },
    );
    await settle();

    const tabs = container.querySelector("[data-admin-tabs]");
    const tab = container.querySelector<HTMLElement>(
      '[data-admin-tab-key="home"]',
    );

    expect(tabs?.classList).toContain("n-tabs");
    expect(tabs?.parentElement?.getAttribute("role")).toBe("tablist");
    expect(tab?.classList).toContain("n-tabs-tab");
    expect(tab?.getAttribute("role")).toBe("tab");
    expect(tab?.getAttribute("aria-selected")).toBe("true");
    expect(tab?.getAttribute("aria-current")).toBe("page");
    tab!.click();
    expect(controller.activate).not.toHaveBeenCalled();
  });

  it("retains host-owned tab state after activation rejects", async () => {
    const controller = reactive({
      current: {
        key: "home",
        label: "Home",
      } as AdminShellTabController["current"],
      activate: vi.fn(async () => {
        throw new Error("navigation denied");
      }),
      close: vi.fn(async () => undefined),
    });
    const container = mountShell(
      { kind: "authenticated" },
      createAuthActions(),
      { tabController: controller },
    );
    await settle();
    controller.current = { key: "settings", label: "Settings" };
    await settle();

    container
      .querySelector<HTMLButtonElement>('[data-admin-tab-key="home"]')!
      .click();
    await settle();

    expect(controller.activate).toHaveBeenCalledWith("home");
    expect(
      container
        .querySelector('[data-admin-tab-key="settings"]')
        ?.getAttribute("data-admin-tab-active"),
    ).toBe("true");
    expect(
      container
        .querySelector('[data-admin-tab-key="settings"]')
        ?.getAttribute("aria-current"),
    ).toBe("page");
    expect(
      container
        .querySelector('[data-admin-tab-key="home"]')
        ?.hasAttribute("aria-current"),
    ).toBe(false);
    expect(container.querySelectorAll("[data-admin-tab-key]")).toHaveLength(2);
    expect(container.textContent).toContain("Unable to activate tab");
  });

  it("updates host descriptors without retaining stale local fields", async () => {
    const controller = reactive({
      current: {
        key: "home",
        label: "Home",
        closable: false,
      } as AdminShellTabController["current"],
      activate: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    });
    const props = reactive({
      authStatus: { kind: "authenticated" } as AdminAuthStatus,
      authActions: createAuthActions(),
      tabController: controller,
    });
    const target = document.createElement("div");
    document.body.append(target);
    const pinia = createPinia();
    setActivePinia(pinia);
    useAdminShellPreferencesStore().initialize();
    const app = createApp({
      setup: () => () => h(AdminShell, props),
    });
    app.use(pinia);
    app.mount(target);
    mountedApps.push(app);
    await settle();

    controller.current = {
      key: "home",
      label: "Renamed Home",
      closable: false,
    };
    await settle();
    expect(getTabClose(target, "home")).toBeNull();

    controller.current = { key: "home", label: "Closable Home" };
    await settle();
    expect(getTabClose(target, "home")).not.toBeNull();
    expect(getTabClose(target, "home")?.classList).toContain(
      "n-tabs-tab__close",
    );

    controller.current = { key: "next", label: "Next", closable: true };
    await settle();
    controller.current = { key: "third", label: "Third", closable: true };
    await settle();
    controller.current = { key: "next", label: "Next", closable: true };
    await settle();
    getTabClose(target, "next")!.click();
    await settle();
    expect(controller.close).toHaveBeenCalledWith("next", "third");
    expect(
      [...target.querySelectorAll("[data-admin-tab-key]")].map((tab) =>
        tab.getAttribute("data-admin-tab-key"),
      ),
    ).toEqual(["home", "third"]);

    controller.current = { key: "third", label: "Third", closable: true };
    await settle();
    getTabClose(target, "third")!.click();
    await settle();
    expect(controller.close).toHaveBeenLastCalledWith("third", "home");
  });

  it("retains per-tab pending ownership across host descriptor refreshes", async () => {
    let resolveActivate: (() => void) | undefined;
    let resolveClose: (() => void) | undefined;
    const controller = reactive({
      current: {
        key: "home",
        label: "Home",
        closable: true,
      } as AdminShellTabController["current"],
      activate: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveActivate = resolve;
          }),
      ),
      close: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveClose = resolve;
          }),
      ),
    });
    const container = mountShell(
      { kind: "authenticated" },
      createAuthActions(),
      { tabController: controller },
    );
    await settle();
    controller.current = { key: "settings", label: "Settings", closable: true };
    await settle();

    container
      .querySelector<HTMLElement>('[data-admin-tab-key="home"]')!
      .click();
    controller.current = {
      key: "settings",
      label: "Updated Settings",
      closable: true,
    };
    await settle();
    container
      .querySelector<HTMLElement>('[data-admin-tab-key="home"]')!
      .click();
    expect(controller.activate).toHaveBeenCalledTimes(1);

    getTabClose(container, "home")!.click();
    controller.current = {
      key: "settings",
      label: "Final Settings",
      closable: true,
    };
    await settle();
    getTabClose(container, "home")!.click();
    expect(controller.close).toHaveBeenCalledTimes(1);

    resolveActivate!();
    resolveClose!();
    await settle();
  });

  it("removes concurrent close requests by key after visible order shifts", async () => {
    const closeResolvers = new Map<string, () => void>();
    const controller = reactive({
      current: {
        key: "a",
        label: "A",
        closable: true,
      } as AdminShellTabController["current"],
      activate: vi.fn(async () => undefined),
      close: vi.fn(
        (key: string) =>
          new Promise<void>((resolve) => {
            closeResolvers.set(key, resolve);
          }),
      ),
    });
    const container = mountShell(
      { kind: "authenticated" },
      createAuthActions(),
      { tabController: controller },
    );
    await settle();

    controller.current = { key: "b", label: "B", closable: true };
    await settle();
    controller.current = { key: "c", label: "C", closable: true };
    await settle();
    getTabClose(container, "a")!.click();
    controller.current = { key: "b", label: "B", closable: true };
    await settle();
    getTabClose(container, "b")!.click();

    closeResolvers.get("a")!();
    await settle();
    closeResolvers.get("b")!();
    await settle();

    expect(
      [...container.querySelectorAll("[data-admin-tab-key]")].map((tab) =>
        tab.getAttribute("data-admin-tab-key"),
      ),
    ).toEqual(["c"]);
  });

  it("removes a tab only after close resolves and retains it on rejection", async () => {
    let rejectClose: ((reason?: unknown) => void) | undefined;
    const controller: AdminShellTabController = {
      current: { key: "home", label: "Home", closable: true },
      activate: vi.fn(async () => undefined),
      close: vi.fn(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectClose = reject;
          }),
      ),
    };
    const container = mountShell(
      { kind: "authenticated" },
      createAuthActions(),
      { tabController: controller },
    );
    const closeButton = getTabClose(container, "home")!;
    closeButton.click();
    closeButton.click();
    await settle();
    expect(controller.close).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector('[data-admin-tab-key="home"]'),
    ).not.toBeNull();
    rejectClose!(new Error("denied"));
    await settle();
    expect(container.textContent).toContain("Unable to close tab");
    expect(
      container.querySelector('[data-admin-tab-key="home"]'),
    ).not.toBeNull();
  });

  it("clears tabs across auth and controller sessions and ignores stale callbacks", async () => {
    let resolveActivate: (() => void) | undefined;
    let resolveNewActivate: (() => void) | undefined;
    const controller = reactive({
      current: { key: "one", label: "One", closable: true } as
        | AdminShellTabController["current"]
        | null,
      activate: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveActivate = resolve;
          }),
      ),
      close: vi.fn(async () => undefined),
    });
    const host = document.createElement("div");
    document.body.append(host);
    const pinia = createPinia();
    setActivePinia(pinia);
    useAdminShellPreferencesStore().initialize();
    const props = reactive({
      authStatus: { kind: "authenticated" } as AdminAuthStatus,
      authActions: createAuthActions(),
      tabController: controller as AdminShellTabController | undefined,
    });
    const app = createApp({
      setup: () => () =>
        h(AdminShell, props, {
          default: () => h("div", { "data-slot": "transition-content" }),
        }),
    });
    app.use(pinia);
    app.mount(host);
    mountedApps.push(app);
    await settle();
    controller.current = { key: "two", label: "Two", closable: true };
    await settle();

    expect(
      host.querySelector('[data-slot="transition-content"]'),
    ).not.toBeNull();
    host
      .querySelector<HTMLElement>("[data-admin-tab-key='one']")!
      .click();
    await settle();
    props.authStatus = { kind: "loading" };
    await settle();
    expect(host.querySelector("[data-admin-tabs]")).toBeNull();
    expect(host.querySelector('[data-slot="transition-content"]')).toBeNull();
    props.authStatus = { kind: "authenticated" };
    const activate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveNewActivate = resolve;
        }),
    );
    const nextController = reactive({
      current: { key: "one", label: "New One" } as
        | AdminShellTabController["current"]
        | null,
      activate,
      close: controller.close,
    });
    props.tabController = nextController;
    await settle();
    nextController.current = { key: "two", label: "New Two" };
    await settle();
    expect(
      host.querySelector('[data-slot="transition-content"]'),
    ).not.toBeNull();
    expect(
      host.querySelector('[data-admin-tab-key="one"]')?.textContent,
    ).toContain("New One");
    host
      .querySelector<HTMLElement>("[data-admin-tab-key='one']")!
      .click();
    await settle();
    expect(activate).toHaveBeenCalledTimes(1);
    resolveActivate!();
    await settle();
    host
      .querySelector<HTMLElement>("[data-admin-tab-key='one']")!
      .click();
    await settle();
    expect(activate).toHaveBeenCalledTimes(1);
    resolveNewActivate!();
    await settle();
    expect(
      host.querySelector('[data-admin-tab-key="one"]')?.textContent,
    ).toContain("New One");
  });

  it("resets tabs across anonymous and controller-removal transitions", async () => {
    const controller: AdminShellTabController = {
      current: { key: "one", label: "One" },
      activate: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    };
    const props = reactive({
      authStatus: { kind: "authenticated" } as AdminAuthStatus,
      authActions: createAuthActions(),
      tabController: controller as AdminShellTabController | undefined,
    });
    const target = document.createElement("div");
    document.body.append(target);
    const pinia = createPinia();
    setActivePinia(pinia);
    useAdminShellPreferencesStore().initialize();
    const app = createApp({
      setup: () => () => h(AdminShell, props),
    });
    app.use(pinia);
    app.mount(target);
    mountedApps.push(app);
    await settle();
    expect(target.querySelector('[data-admin-tab-key="one"]')).not.toBeNull();

    props.authStatus = { kind: "anonymous" };
    await settle();
    expect(target.querySelector("[data-admin-tabs]")).toBeNull();
    props.authStatus = { kind: "authenticated" };
    await settle();
    expect(target.querySelector('[data-admin-tab-key="one"]')).not.toBeNull();

    props.tabController = undefined;
    await settle();
    expect(target.querySelector("[data-admin-tabs]")).toBeNull();
    props.tabController = {
      ...controller,
      current: { key: "two", label: "Two" },
    };
    await settle();
    expect(target.querySelector('[data-admin-tab-key="one"]')).toBeNull();
    expect(target.querySelector('[data-admin-tab-key="two"]')).not.toBeNull();
  });
});
