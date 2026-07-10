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
    const container = mountShell(
      { kind: "authenticated", userLabel: "Ada" },
      createAuthActions(),
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

    const theme = container.querySelector<HTMLSelectElement>(
      'select[name="theme-mode"]',
    );
    theme!.value = "dark";
    theme!.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    const preferences = useAdminShellPreferencesStore();
    expect(preferences.themeMode).toBe("dark");
    expect(theme?.value).toBe("dark");

    const fontSize = container.querySelector<HTMLSelectElement>(
      'select[name="font-size"]',
    );
    fontSize!.value = "large";
    fontSize!.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    expect(preferences.fontSize).toBe("large");
    expect(fontSize?.value).toBe("large");

    const locale = container.querySelector<HTMLSelectElement>(
      'select[name="locale"]',
    );
    expect(locale?.disabled).toBe(true);
    preferences.setAvailableLocales([
      { key: "en", label: "English" },
      { key: "fr", label: "Français" },
    ]);
    await settle();
    expect(locale?.disabled).toBe(false);
    locale!.value = "fr";
    locale!.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    expect(preferences.locale).toBe("fr");
    expect(locale?.value).toBe("fr");

    const sidebarButton = container.querySelector<HTMLButtonElement>(
      '[data-admin-control="sidebar"]',
    );
    sidebarButton!.click();
    await settle();
    expect(preferences.sidebarCollapsed).toBe(true);
    expect(sidebarButton?.getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps host current tab authoritative and awaits tab actions", async () => {
    let resolveActivate: (() => void) | undefined;
    const controller: AdminShellTabController = {
      current: { key: "home", label: "Home", closable: false },
      activate: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveActivate = resolve;
          }),
      ),
      close: vi.fn(async () => undefined),
    };
    const container = mountShell(
      { kind: "authenticated" },
      createAuthActions(),
      { tabController: controller },
    );
    await settle();

    expect(
      container.querySelector('[data-admin-tab-key="home"]'),
    ).not.toBeNull();
    expect(
      container
        .querySelector('[data-admin-tab-key="home"]')
        ?.getAttribute("aria-selected"),
    ).toBe("true");

    const tab = container.querySelector<HTMLButtonElement>(
      '[data-admin-tab-key="home"]',
    );
    tab!.click();
    tab!.click();
    expect(controller.activate).toHaveBeenCalledTimes(1);
    expect(
      container
        .querySelector('[data-admin-tab-key="home"]')
        ?.getAttribute("aria-selected"),
    ).toBe("true");
    resolveActivate!();
    await settle();
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
        ?.getAttribute("aria-selected"),
    ).toBe("true");
    expect(container.querySelectorAll("[data-admin-tab-key]")).toHaveLength(2);
    expect(container.textContent).toContain("Unable to activate tab");
  });

  it("updates tab labels, preserves non-closable tabs, and removes after close", async () => {
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
    expect(
      target.querySelector('[data-admin-tab-key="home"]')?.textContent,
    ).toContain("Renamed Home");
    expect(target.querySelector('[data-admin-tab-close="home"]')).toBeNull();

    controller.current = { key: "next", label: "Next", closable: true };
    await settle();
    target
      .querySelector<HTMLButtonElement>('[data-admin-tab-close="next"]')!
      .click();
    await settle();
    expect(controller.close).toHaveBeenCalledWith("next", "home");
    expect(target.querySelector('[data-admin-tab-key="next"]')).toBeNull();
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
    await settle();

    const closeButton = container.querySelector<HTMLButtonElement>(
      "[data-admin-tab-close]",
    )!;
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
    const controller: AdminShellTabController = {
      current: { key: "one", label: "One", closable: true },
      activate: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveActivate = resolve;
          }),
      ),
      close: vi.fn(async () => undefined),
    };
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

    expect(
      host.querySelector('[data-slot="transition-content"]'),
    ).not.toBeNull();
    host
      .querySelector<HTMLButtonElement>("[data-admin-tab-key='one']")!
      .click();
    props.authStatus = { kind: "loading" };
    await settle();
    expect(host.querySelector("[data-admin-tabs]")).toBeNull();
    expect(host.querySelector('[data-slot="transition-content"]')).toBeNull();
    props.authStatus = { kind: "authenticated" };
    props.tabController = {
      ...controller,
      current: { key: "one", label: "New One" },
      activate: vi.fn(async () => undefined),
    };
    await settle();
    expect(
      host.querySelector('[data-slot="transition-content"]'),
    ).not.toBeNull();
    expect(
      host.querySelector('[data-admin-tab-key="one"]')?.textContent,
    ).toContain("New One");
    resolveActivate!();
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
