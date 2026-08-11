import {
  useAdminAuthStore,
  type AdminAuthIdentity,
  type AdminAuthRestoreResult,
  type AdminLoginValues,
} from "@noob-naive-ui/admin";
import { createAdminRouterPlugin } from "@noob-naive-ui/admin-vue-router";
import { createPinia } from "pinia";
import { createApp, ref } from "vue";
import { createWebHistory } from "vue-router";

import "@noob-naive-ui/admin/style.css";

import App from "./App";
import { i18n } from "./i18n";
import { demoRouteRegistry, describeDemoDestination } from "./routes";
import "./style.css";

/** Creates the demo's application-owned Pinia instance before public stores resolve. */
const pinia = createPinia();
/** Identifies history entries created for the current authenticated demo session. */
const navigationScopeId = ref(crypto.randomUUID());
/** Host-owned key for the backend-free demo's fake session authority. */
const demoSessionKey = "noob-components-v2:demo:session";

/** Resolves the package-owned frontend auth runtime against application Pinia. */
const auth = useAdminAuthStore(pinia);

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

const meta = document.createElement("meta");
meta.name = "naive-ui-style";
document.head.appendChild(meta);
app.mount("#app");
