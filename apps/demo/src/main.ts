import {
  useAdminAuthStore,
  useAdminShellMenuStore,
  useAdminShellPreferencesStore,
  type AdminAuthIdentity,
  type AdminAuthRestoreResult,
  type AdminLoginValues,
} from "@noob-naive-ui/admin";
import { createAdminRouterPlugin } from "@noob-naive-ui/admin-vue-router";
import type { MenuOption } from "naive-ui";
import { createPinia } from "pinia";
import { createApp, ref } from "vue";
import { createWebHistory } from "vue-router";

import "@noob-naive-ui/admin/style.css";

import App from "./App";
import { i18n } from "./i18n";
import {
  demoRouteRegistry,
  describeDemoDestination,
  type DemoNavKey,
} from "./routes";
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
    throw new Error(i18n.global.t("login.credentialsRequired"));
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
  fallbackLocale: "en",
});

/**
 * Seeds the global Composer active locale from the hydrated preference so the
 * pre-auth login page renders the restored locale before AdminShell mounts.
 * The store locale is string-typed by contract; the demo Composer's active
 * locale type is the packaged message-key union. An unsupported value stays
 * active and renders through the host-owned fallback, per the i18n contract.
 */
i18n.global.locale.value = preferences.locale as "en" | "zh-CN";

/** Supplies demo menu hierarchy through the reactive admin menu store. */
const menu = useAdminShellMenuStore(pinia);
menu.configure(createDemoMenu());

/**
 * Creates the package-owned admin router plugin. Its install binds the admin
 * stores and registers the router, so it must run after `app.use(pinia)`.
 */
const adminRouter = createAdminRouterPlugin({
  history: createWebHistory(),
  registry: demoRouteRegistry,
  homeDestination: { navKey: "dashboard" },
  describeDestination: describeDemoDestination,
  createPageId: () => crypto.randomUUID(),
  getNavigationScopeId: () => navigationScopeId.value,
});

/** Mounts the backend-free demonstration with the package-owned admin router. */
const app = createApp(App).use(pinia).use(i18n).use(adminRouter);

/** Import a package's corresponding i18n plugin to override localization messages. */
// import { adminI18nPlugin } from "@noob-naive-ui/admin";
// app.use(adminI18nPlugin, {
//   messages: {
//     en: { AdminShell: { account: { signOut: "Log out" } } },
//     "zh-CN": { AdminShell: { account: { signOut: "退出" } } },
//   },
// });
app.mount("#app");

/** Creates one menu option with a reactive locale label while preserving host-owned nav-key identity. */
function createMenuOption(
  navKey: DemoNavKey,
  labelKey: `nav.${string}`,
): MenuOption {
  return { key: navKey, label: () => i18n.global.t(labelKey) };
}

/** Supplies the demo menu tree without coupling its hierarchy to route generation. */
function createDemoMenu(): MenuOption[] {
  return [
    createMenuOption("dashboard", "nav.dashboard"),
    {
      key: "demo",
      label: () => i18n.global.t("nav.demo"),
      children: [
        createMenuOption("internationalization", "nav.internationalization"),
      ],
    },
    {
      key: "workspace",
      label: () => i18n.global.t("nav.workspace"),
      children: [
        createMenuOption("reports", "nav.reports"),
        createMenuOption("settings", "nav.settings"),
      ],
    },
  ];
}
