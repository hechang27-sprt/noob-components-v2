// @vitest-environment happy-dom

import { createPinia, setActivePinia } from "pinia";
import { createApp, defineComponent, inject, type App } from "vue";
import { createI18n } from "vue-i18n";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminLoginPage } from "../src/components/admin-login-page";
import { AdminProvider } from "../src/components/admin-provider";
import {
  libraryOverridesKey,
  type RegistryI18nOverrides,
} from "@noob-naive-ui/registry";
import { selectComponentOverrides } from "@noob-naive-ui/i18n";
import type { AdminLocaleOverrides } from "../src/i18n";
import { useAdminAuthStore } from "../src/stores/auth";
import { LIB_ID } from "@noob-naive-ui/admin";

/** Retains mounted test applications so each test releases Vue resources. */
const mountedApps: App[] = [];

/** Unmounts test applications and clears the synthetic document after each test. */
afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount();
  document.body.replaceChildren();
});

/**
 * Mounts AdminLoginPage under a host-owned global Composer and an anonymous
 * signed-out auth status, with optional package overrides supplied through
 * the AdminProvider `i18nOverrides` prop (the replacement for the removed
 * `adminI18nPlugin` install path).
 *
 * @param options - Host locale/fallback settings and optional package overrides.
 * @returns The mounted container and the host global Composer.
 */
function mountLoginPage(
  options: {
    locale?: string;
    fallbackLocale?: string;
    overrides?: RegistryI18nOverrides;
  } = {},
) {
  const target = document.createElement("div");
  document.body.append(target);
  const i18n = createI18n({
    legacy: false,
    locale: options.locale ?? "en",
    fallbackLocale: options.fallbackLocale ?? "en",
    messages: {},
  });
  const pinia = createPinia();
  const app = createApp({
    setup: () => () => (
      <AdminProvider
        messages={{}}
        menu={[]}
        storeOptions={{
          defaults: { locale: options.locale ?? "en" },
          storage: null,
        }}
        i18nOverrides={options.overrides}>
        <AdminLoginPage />
      </AdminProvider>
    ),
  });
  app.use(pinia);
  app.use(i18n);
  setActivePinia(pinia);
  const store = useAdminAuthStore();
  store.configure({
    login: vi.fn(),
    restore: () => new Promise(() => {}),
    logout: () => {},
  });
  store.waitForRestoration().catch(() => {});
  (store as unknown as Record<string, unknown>).status = {
    kind: "anonymous",
    reason: "signed-out",
  };
  app.mount(target);
  mountedApps.push(app);
  return { container: target, i18n };
}

/**
 * Captures the application-scoped snapshot provided by AdminProvider's
 * `i18nOverrides` prop through the injection key `createComponentI18n` reads.
 *
 * @param overrides - Caller-owned override tree passed to the prop.
 * @returns The snapshot observed through Vue's application provider map.
 */
function captureProviderSnapshot(
  overrides: RegistryI18nOverrides,
): AdminLocaleOverrides {
  let captured: AdminLocaleOverrides | undefined;
  const Capture = defineComponent({
    name: "SnapshotCapture",
    setup() {
      const registry = inject(libraryOverridesKey, null);
      captured = registry?.value?.[LIB_ID]?.i18n as
        | AdminLocaleOverrides
        | undefined;
      return () => null;
    },
  });
  const target = document.createElement("div");
  document.body.append(target);
  const i18n = createI18n({ legacy: false, locale: "en", messages: {} });
  const pinia = createPinia();
  const app = createApp({
    setup: () => () => (
      <AdminProvider messages={{}} menu={[]} i18nOverrides={overrides}>
        <Capture />
      </AdminProvider>
    ),
  });
  app.use(i18n);
  app.use(pinia);
  setActivePinia(pinia);
  app.mount(target);
  mountedApps.push(app);
  if (!captured) throw new Error("Admin i18n snapshot was not provided");
  return captured;
}

describe("admin i18n overrides via AdminProvider", () => {
  it("snapshots caller overrides when provided through the prop", () => {
    const overrides: RegistryI18nOverrides = {
      [LIB_ID]: {
        en: { AdminShell: { account: { signOut: "Installed sign out" } } },
      },
    };
    const snapshot = captureProviderSnapshot(overrides);
    (
      overrides[LIB_ID] as AdminLocaleOverrides
    ).en!.AdminShell!.account!.signOut = "Mutated sign out";
    expect(snapshot?.en?.AdminShell?.account?.signOut).toBe(
      "Installed sign out",
    );
  });

  it("selects only the requested component slices by locale", () => {
    const overrides: AdminLocaleOverrides = {
      en: { AdminShell: { account: { signOut: "Log out" } } },
      "zh-CN": { AdminLoginPage: { form: { signIn: "登录" } } },
    };
    expect(selectComponentOverrides(overrides, "AdminShell")).toEqual({
      en: { account: { signOut: "Log out" } },
    });
    expect(selectComponentOverrides(overrides, "AdminLoginPage")).toEqual({
      "zh-CN": { form: { signIn: "登录" } },
    });
  });
});

describe("AdminLoginPage locale ownership", () => {
  it("merges a partial override after defaults without losing siblings", () => {
    const { container } = mountLoginPage({
      overrides: {
        [LIB_ID]: {
          en: { AdminLoginPage: { form: { signIn: "Log in" } } },
        },
      },
    });
    const submit = container.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    expect(submit?.textContent).toBe("Log in");
    expect(container.textContent).toContain("Username");
  });

  it("renders the packaged zh-CN defaults when the host locale is zh-CN", () => {
    const { container } = mountLoginPage({ locale: "zh-CN" });
    expect(container.textContent).toContain("登录");
    expect(container.textContent).toContain("用户名");
    expect(container.textContent).toContain("您已退出登录。");
  });

  it("keeps an unsupported active locale while rendering the host fallback", () => {
    const { container, i18n } = mountLoginPage({
      locale: "fr",
      fallbackLocale: "en",
    });
    expect(i18n.global.locale.value).toBe("fr");
    expect(container.textContent).toContain("You have signed out.");
    expect(container.textContent).toContain("Sign in");
  });
});
