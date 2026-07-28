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
  navigationScopeId.value = crypto.randomUUID();
  return { userLabel: username };
}

/**
 * Restores a deterministic fake host session for the backend-free demo.
 *
 * Add `?restore=authenticated` to demonstrate authenticated startup; every
 * other value demonstrates an ordinary anonymous startup.
 *
 * @returns A frontend-only restore result without session or transport data.
 */
async function restore(): Promise<AdminAuthRestoreResult> {
  const authenticated =
    new URLSearchParams(window.location.search).get("restore") ===
    "authenticated";
  return authenticated
    ? {
        kind: "authenticated",
        identity: { userLabel: "Restored demo user" },
      }
    : { kind: "anonymous" };
}

/** Completes the fake logout effect without owning package auth state or routing. */
async function logout(): Promise<void> {}

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
