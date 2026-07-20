// @vitest-environment happy-dom

import type { MenuOption } from "naive-ui";
import { createPinia, setActivePinia } from "pinia";
import { createApp, defineComponent, h, nextTick, reactive, type App, type VNodeChild } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminShell, useAdminShell } from "../src/components/admin-shell";
import type {
  AdminShellDestination,
  AdminShellNavigation,
  AdminShellTabNavigationResolver,
} from "../src/components/admin-shell";
import type {
  AdminAuthActions,
  AdminAuthStatus,
} from "../src/runtime-contract";
import { useAdminShellPreferencesStore } from "../src/stores/shell-preferences";


/** Exercises descendant access to the nearest provided AdminShell context. */
const ShellContextConsumer = defineComponent(
  /**
   * Resolves shell context during descendant setup and renders its reactive state and action.
   *
   * @returns A render function exposing the active label and one destination request button.
   */
  () => {
    /** Retains the nearest shell's public descendant context. */
    const shell = useAdminShell();
    return () => (
      <section>
        <span data-shell-active="">{shell.active.value?.label ?? "none"}</span>
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
 * @param options - Optional opaque menu, navigation adapter, and synthetic slots.
 * @returns The mounted application container.
 */
function mountShell(
  authStatus: AdminAuthStatus,
  authActions: AdminAuthActions,
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
  const preferences = useAdminShellPreferencesStore();
  preferences.initialize();
  /** Deliberately passes non-default slots to prove that AdminShell ignores them. */
  const slots = {
    default: options.defaultSlot ??
      (options.content
        ? () => h("div", { "data-slot": options.content })
        : undefined),
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
          navigation: options.navigation,
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

  it("provides reactive active state and navigation to descendants", async () => {
    const home = { id: "home", nav: { navKey: "home" }, label: "Home" };
    const report = { id: "report", nav: { navKey: "reports" }, label: "Report" };
    const navigation = reactive<AdminShellNavigation>({
      active: home,
      handleNavigation: vi.fn(async (request) => ({
        active: request.kind === "open"
          ? { ...request.candidate, label: "Report" }
          : request.destination,
      })),
    });
    const container = mountShell({ kind: "authenticated" }, createAuthActions(), {
      navigation,
      defaultSlot: () => h(ShellContextConsumer),
    });
    await settle();
    expect(container.querySelector("[data-shell-active]")?.textContent).toBe("Home");
    navigation.active = report;
    await settle();
    expect(container.querySelector("[data-shell-active]")?.textContent).toBe("Report");
    container.querySelector<HTMLButtonElement>("[data-shell-navigate]")!.click();
    await settle();
    const request = vi.mocked(navigation.handleNavigation).mock.calls.at(-1)?.[0];
    expect(request?.kind).toBe("open");
    if (request?.kind !== "open") throw new Error("Expected open request.");
    expect(request.candidate.nav).toEqual({ navKey: "settings" });
    expect(request.current).toEqual(report);
  });

  it("isolates descendant context between concurrently mounted shells", async () => {
    const firstNavigation: AdminShellNavigation = {
      active: { id: "first", nav: { navKey: "first" }, label: "First" },
      handleNavigation: vi.fn(async () => ({ active: null })),
    };
    const secondNavigation: AdminShellNavigation = {
      active: { id: "second", nav: { navKey: "second" }, label: "Second" },
      handleNavigation: vi.fn(async () => ({ active: null })),
    };
    const first = mountShell({ kind: "authenticated" }, createAuthActions(), {
      navigation: firstNavigation,
      defaultSlot: () => h(ShellContextConsumer),
    });
    const second = mountShell({ kind: "authenticated" }, createAuthActions(), {
      navigation: secondNavigation,
      defaultSlot: () => h(ShellContextConsumer),
    });
    await settle();
    expect(first.querySelector("[data-shell-active]")?.textContent).toBe("First");
    expect(second.querySelector("[data-shell-active]")?.textContent).toBe("Second");
    second.querySelector<HTMLButtonElement>("[data-shell-navigate]")!.click();
    await settle();
    expect(firstNavigation.handleNavigation).not.toHaveBeenCalled();
    expect(secondNavigation.handleNavigation).toHaveBeenCalledOnce();
  });

  it("throws when descendant context is requested outside AdminShell", () => {
    const target = document.createElement("div");
    document.body.append(target);
    const app = createApp(ShellContextConsumer);
    expect(() => app.mount(target)).toThrow(
      "useAdminShell() requires an ancestor AdminShell.",
    );
  });

  it("commits a menu open candidate only after host confirmation", async () => {
    let resolveOpen: ((value: { active: AdminShellNavigation["active"] }) => void) | undefined;
    const home = { id: "home-1", nav: { navKey: "home" }, label: "Home", closable: false };
    const navigation = reactive<AdminShellNavigation>({
      active: home,
      handleNavigation: vi.fn(
        () => new Promise((resolve) => { resolveOpen = resolve; }),
      ),
    });
    const container = mountShell({ kind: "authenticated" }, createAuthActions(), {
      menuOptions: [{ key: "home", label: "Home" }, { key: "settings", label: "Settings" }],
      navigation,
    });
    await settle();
    [...container.querySelectorAll<HTMLElement>(".n-menu-item-content")]
      .find((item) => item.textContent?.includes("Settings"))!.click();
    await settle();
    const request = vi.mocked(navigation.handleNavigation).mock.calls[0]![0];
    expect(request.kind).toBe("open");
    if (request.kind !== "open") throw new Error("Expected open request.");
    expect(request.candidate.nav).toEqual({ navKey: "settings" });
    expect(request.current).toEqual(home);
    expect(container.querySelectorAll("[data-admin-tab-key]")).toHaveLength(1);
    const confirmed = { id: request.candidate.id, nav: request.candidate.nav, label: "Settings", closable: true };
    navigation.active = confirmed;
    resolveOpen!({ active: confirmed });
    await settle();
    expect(container.querySelector(`[data-admin-tab-key="${confirmed.id}"]`)).not.toBeNull();
  });

  it("does not commit a rejected open candidate", async () => {
    const navigation: AdminShellNavigation = {
      active: { id: "home-1", nav: { navKey: "home" }, label: "Home" },
      handleNavigation: vi.fn(async () => { throw new Error("private failure"); }),
    };
    const container = mountShell({ kind: "authenticated" }, createAuthActions(), {
      menuOptions: [{ key: "settings", label: "Settings" }], navigation,
    });
    await settle();
    container.querySelector<HTMLElement>(".n-menu-item-content")!.click();
    await settle();
    await settle();
    expect(container.querySelectorAll("[data-admin-tab-key]")).toHaveLength(1);
    expect(container.textContent).toContain("Unable to navigate");
    expect(container.textContent).not.toContain("private failure");
  });

  it("activates the newest matching navKey while ignoring parameters", async () => {
    const home = { id: "home", nav: { navKey: "home" }, label: "Home" };
    const older = { id: "report-1", nav: { navKey: "reports", params: { id: 1 } }, label: "Report 1" };
    const newer = { id: "report-2", nav: { navKey: "reports", params: { id: 2 } }, label: "Report 2" };
    const navigation = reactive<AdminShellNavigation>({
      active: home,
      handleNavigation: vi.fn(async (request) => {
        const active = request.kind === "open" ? null : request.destination;
        navigation.active = active;
        return { active };
      }),
    });
    const container = mountShell({ kind: "authenticated" }, createAuthActions(), {
      menuOptions: [{ key: "reports", label: "Reports" }], navigation,
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
    expect(navigation.handleNavigation).toHaveBeenLastCalledWith({ kind: "activate", destination: newer, current: home });
  });

  it("accepts a call-specific resolver without storing it in the destination", async () => {
    const home = { id: "home", nav: { navKey: "home" }, label: "Home" };
    const report = { id: "report-1", nav: { navKey: "reports" }, label: "Report" };
    const navigation = reactive<AdminShellNavigation>({
      active: home,
      handleNavigation: vi.fn(async (request) => ({
        active: request.kind === "open"
          ? { ...request.candidate, label: "New report" }
          : request.destination,
      })),
    });
    const resolver = vi.fn(() => ({ kind: "open" as const }));
    const container = mountShell({ kind: "authenticated" }, createAuthActions(), {
      navigation,
      defaultSlot: ({ navigate }) => h("button", {
        "data-open-report": "",
        onClick: () => void navigate({ navKey: "reports" }, resolver),
      }),
    });
    await settle();
    navigation.active = report;
    await settle();
    navigation.active = home;
    await settle();
    container.querySelector<HTMLElement>("[data-open-report]")!.click();
    await settle();
    expect(resolver).toHaveBeenCalledWith([home, report], { navKey: "reports" });
    expect(vi.mocked(navigation.handleNavigation).mock.calls.at(-1)?.[0].kind).toBe("open");
  });

  it("keeps duplicate destinations as independently closable page instances", async () => {
    const first = { id: "same-1", nav: { navKey: "reports", params: { id: 1 } }, label: "First", closable: true };
    const second = { id: "same-2", nav: { navKey: "reports", params: { id: 1 } }, label: "Second", closable: true };
    const navigation = reactive<AdminShellNavigation>({
      active: first,
      handleNavigation: vi.fn(async (request) => ({ active: request.kind === "close" ? request.destination : request.kind === "open" ? null : request.destination })),
    });
    const container = mountShell({ kind: "authenticated" }, createAuthActions(), { navigation });
    await settle();
    navigation.active = second;
    await settle();
    getTabClose(container, "same-1")!.click();
    await settle();
    expect(navigation.handleNavigation).toHaveBeenLastCalledWith({ kind: "close", closing: first, destination: second });
    expect(container.querySelector('[data-admin-tab-key="same-1"]')).toBeNull();
    expect(container.querySelector('[data-admin-tab-key="same-2"]')).not.toBeNull();
  });

  it("clears page instances when auth or the navigation boundary changes", async () => {
    const first: AdminShellNavigation = {
      active: { id: "one", nav: { navKey: "one" }, label: "One" },
      handleNavigation: vi.fn(async () => ({ active: null })),
    };
    const props = reactive({
      authStatus: { kind: "authenticated" } as AdminAuthStatus,
      authActions: createAuthActions(),
      navigation: first as AdminShellNavigation | undefined,
    });
    const target = document.createElement("div");
    document.body.append(target);
    const pinia = createPinia();
    setActivePinia(pinia);
    useAdminShellPreferencesStore().initialize();
    const app = createApp({ setup: () => () => h(AdminShell, props) });
    app.use(pinia);
    app.mount(target);
    mountedApps.push(app);
    await settle();
    props.authStatus = { kind: "anonymous" };
    await settle();
    expect(target.querySelector("[data-admin-tabs]")).toBeNull();
    props.authStatus = { kind: "authenticated" };
    props.navigation = {
      active: { id: "two", nav: { navKey: "two" }, label: "Two" },
      handleNavigation: vi.fn(async () => ({ active: null })),
    };
    await settle();
    expect(target.querySelector('[data-admin-tab-key="one"]')).toBeNull();
    expect(target.querySelector('[data-admin-tab-key="two"]')).not.toBeNull();
  });
});
