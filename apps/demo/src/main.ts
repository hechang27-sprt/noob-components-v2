import {
  useAdminAuthStore,
  useAdminShellMenuStore,
  useAdminShellPreferencesStore,
  type AdminAuthIdentity,
  type AdminAuthRestoreResult,
  type AdminLoginValues,
} from "@noob-naive-ui/admin";
import { createAdminRouter } from "@noob-naive-ui/admin-vue-router";
import type { MenuOption } from "naive-ui";
import { createPinia } from "pinia";
import { createApp, ref } from "vue";
import { createWebHistory } from "vue-router";

import "@noob-naive-ui/admin/style.css";

import App from "./App";
import { describeDemoDestination } from "./admin-navigation";
import { demoRouteRegistry } from "./route-registry";
import type { DemoNavKey } from "./route-registry";
import "./style.css";

/** Creates the demo's application-owned Pinia instance before public stores resolve. */
const pinia = createPinia();
/** Identifies history entries created for the current authenticated demo session. */
const navigationScopeId = ref(crypto.randomUUID());
/** Host-owned key for the backend-free demo's fake session authority. */
const demoSessionKey = "noob-components-v2:demo:session";

/** Resolves the package-owned frontend auth runtime against application Pinia. */
const auth = useAdminAuthStore(pinia);
/** Resolves the public preference store against application Pinia. */
const preferences = useAdminShellPreferencesStore(pinia);

/**
 * Validates fake credentials and returns presentation identity without mutating auth state.
 *
 * @param values - Frontend login values supplied by the package login action.
 * @returns Presentation-only identity for the authenticated demo account.
 */
async function login(values: AdminLoginValues): Promise<AdminAuthIdentity> {
  const username = values.username.trim();
  const password = values.password.trim();
  if (!username || !password) {
    throw new Error("Username and password are required.");
  }
  const targetStorage = values.remember
    ? window.localStorage
    : window.sessionStorage;
  const oppositeStorage = values.remember
    ? window.sessionStorage
    : window.localStorage;
  targetStorage.setItem(demoSessionKey, username);
  oppositeStorage.removeItem(demoSessionKey);
  navigationScopeId.value = crypto.randomUUID();
  return { userLabel: username };
}

/**
 * Reads the demo host's own session authority. LocalStorage models a
 * remembered session; SessionStorage models a tab-scoped session.
 *
 * @returns Fresh presentation identity when a host session exists.
 */
async function restore(): Promise<AdminAuthRestoreResult> {
  const username =
    window.sessionStorage.getItem(demoSessionKey) ??
    window.localStorage.getItem(demoSessionKey);
  return username
    ? { kind: "authenticated", identity: { userLabel: username } }
    : { kind: "anonymous" };
}

/** Clears the fake host session from both supported lifetime tiers. */
async function logout(): Promise<void> {
  window.localStorage.removeItem(demoSessionKey);
  window.sessionStorage.removeItem(demoSessionKey);
}

auth.configure({ login, logout, restore });
preferences.initialize({
  defaults: {
    availableLocales: [
      { key: "en", label: "English" },
      { key: "zh-CN", label: "简体中文" },
    ],
  },
});

/** Supplies demo menu hierarchy through the reactive admin menu store. */
const menu = useAdminShellMenuStore(pinia);
menu.configure(createDemoMenu());

/** Creates the package-owned router after host-owned stores are configured. */
const router = createAdminRouter({
  pinia,
  history: createWebHistory(),
  registry: demoRouteRegistry,
  homeDestination: { navKey: "dashboard" },
  describeDestination: describeDemoDestination,
  createPageId: () => crypto.randomUUID(),
  getNavigationScopeId: () => navigationScopeId.value,
});

/** Mounts the backend-free demonstration with the package-owned admin router. */
createApp(App).use(pinia).use(router).mount("#app");

/** Creates one plain menu option while preserving host-owned nav-key identity. */
function createMenuOption(navKey: DemoNavKey, label: string): MenuOption {
  return { key: navKey, label };
}

/** Supplies the demo menu tree without coupling its hierarchy to route generation. */
function createDemoMenu(): MenuOption[] {
  return [
    createMenuOption("dashboard", "Dashboard"),
    {
      key: "workspace",
      label: "Workspace",
      children: [
        createMenuOption("reports", "Reports"),
        createMenuOption("settings", "Settings"),
      ],
    },
  ];
}
