import {
  NButton,
  NCard,
  NCheckbox,
  NForm,
  NFormItem,
  NInput,
  NResult,
  NSpin,
} from "naive-ui";
import { useComponentI18n } from "@noob-naive-ui/i18n";
import { defineComponent, ref, useId } from "vue";

import adminLoginPageMessages from "../locales/AdminLoginPage.json";
import {
  DEFAULT_SNAPSHOT,
  adminI18nOverridesKey,
  selectAdminLoginPageOverrides,
} from "../i18n/plugin";
import type { AdminAuthStatus, AdminLoginValues } from "../runtime-contract";
import { useAdminAuthStore } from "../stores/auth";

export type AdminLoginPageProps = Record<string, never>;

/**
 * Resolves the locale message key for one anonymous status reason.
 *
 * @param reason - The anonymous auth status reason supplied by the auth store.
 * @returns The status message key, or undefined for the default reason.
 */
function getAnonymousStatusMessageKey(
  reason: Extract<AdminAuthStatus, { kind: "anonymous" }>["reason"],
) {
  switch (reason) {
    case "expired":
      return "status.expired" as const;
    case "forbidden":
      return "status.forbidden" as const;
    case "signed-out":
      return "status.signedOut" as const;
    case "unknown":
      return "status.unknown" as const;
    default:
      return undefined;
  }
}

export const AdminLoginPage = defineComponent(
  () => {
    const store = useAdminAuthStore();
    const formId = useId();
    const username = ref("");
    const password = ref("");
    const remember = ref(false);

    // Fresh local registry: packaged defaults first, the AdminLoginPage
    // override slice second, so overrides win at the leaf.
    const { t } = useComponentI18n({
      messages: adminLoginPageMessages,
      overridesKey: adminI18nOverridesKey,
      emptySnapshot: DEFAULT_SNAPSHOT,
      selectOverrides: selectAdminLoginPageOverrides,
    });

    function clearFeedback(): void {
      store.loginError = undefined;
    }

    async function submit(): Promise<void> {
      if (store.loginPending) return;

      clearFeedback();

      const values: AdminLoginValues = {
        username: username.value,
        password: password.value,
        remember: remember.value,
      };

      try {
        await store.login(values);
      } catch {
        // Error is already stored in store.loginError by the store action.
      }
    }

    return () => {
      const status = store.status;
      const pending = store.loginPending;

      if (status.kind === "loading") {
        return (
          <main
            class="grid min-h-dvh place-items-center p-6 max-sm:items-start max-sm:p-4"
            aria-busy="true">
            <NCard class="w-full max-w-md" content-style="padding: 0">
              <h1 class="sr-only">{t("loading.title")}</h1>
              <p class="sr-only" role="status" aria-live="polite">
                {t("loading.description")}
              </p>
              <NSpin show size="large" description={t("loading.description")}>
                <div class="h-48" />
              </NSpin>
            </NCard>
          </main>
        );
      }

      if (status.kind === "authenticated") {
        const description = status.userLabel
          ? t("alreadySignedIn.signedInAs", { user: status.userLabel })
          : t("alreadySignedIn.generic");

        return (
          <main class="grid min-h-dvh place-items-center p-6 max-sm:items-start max-sm:p-4">
            <NCard class="w-full max-w-md" content-style="padding: 0">
              <h1 class="sr-only">{t("alreadySignedIn.title")}</h1>
              <p class="sr-only" role="status">
                {description}
              </p>
              <NResult
                status="success"
                title={t("alreadySignedIn.title")}
                description={description}
              />
            </NCard>
          </main>
        );
      }

      const statusMessageKey = getAnonymousStatusMessageKey(status.reason);
      const anonymousStatusMessage = statusMessageKey
        ? t(statusMessageKey)
        : undefined;

      return (
        <main class="grid min-h-dvh place-items-center p-6 max-sm:items-start max-sm:p-4">
          <NCard class="w-full max-w-md">
            <h1 class="mb-5 text-xl font-semibold">{t("form.signIn")}</h1>
            <NForm
              onSubmit={(event: Event) => {
                event.preventDefault();
                void submit();
              }}>
              {anonymousStatusMessage ? (
                <p class="mb-4 text-sm" role="status">
                  {anonymousStatusMessage}
                </p>
              ) : null}
              <NFormItem
                label={t("form.username")}
                label-props={{ for: `${formId}-username` }}>
                <NInput
                  value={username.value}
                  disabled={pending}
                  input-props={{
                    id: `${formId}-username`,
                    name: "username",
                    autocomplete: "username",
                    required: true,
                  }}
                  onUpdateValue={(value) => {
                    username.value = value;
                    clearFeedback();
                  }}
                />
              </NFormItem>
              <NFormItem
                label={t("form.password")}
                label-props={{ for: `${formId}-password` }}>
                <NInput
                  type="password"
                  value={password.value}
                  disabled={pending}
                  input-props={{
                    id: `${formId}-password`,
                    name: "password",
                    autocomplete: "current-password",
                    required: true,
                  }}
                  onUpdateValue={(value) => {
                    password.value = value;
                    clearFeedback();
                  }}
                />
              </NFormItem>
              <NFormItem>
                <NCheckbox
                  checked={remember.value}
                  disabled={pending}
                  onUpdateChecked={(checked) => {
                    remember.value = checked as boolean;
                    clearFeedback();
                  }}>
                  {t("form.rememberMe")}
                </NCheckbox>
              </NFormItem>
              {store.loginError ? (
                <p class="mb-4 text-sm" role="alert">
                  {store.loginError}
                </p>
              ) : null}
              <NButton
                attr-type="submit"
                type="primary"
                block
                loading={pending}
                disabled={pending}>
                {pending ? t("form.signingIn") : t("form.signIn")}
              </NButton>
            </NForm>
          </NCard>
        </main>
      );
    };
  },
  {
    name: "AdminLoginPage",
  },
);
