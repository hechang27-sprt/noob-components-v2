import {
  NButton,
  NCard,
  NCheckbox,
  NElement,
  NFlex,
  NForm,
  NFormItem,
  NH1,
  NInput,
  NP,
  NResult,
  NSpin,
} from "naive-ui";
import { createComponentI18n } from "@noob-naive-ui/i18n";
import { defineComponent, ref, useId } from "vue";

import adminLoginPageMessages from "../locales/AdminLoginPage.json";
import { adminI18n } from "../i18n/plugin";
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
    const { t } = createComponentI18n({
      messages: adminLoginPageMessages,
      plugin: adminI18n,
      componentId: "AdminLoginPage",
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

    const renderSignInForm = () => (
      <NForm
        onSubmit={(event: Event) => {
          event.preventDefault();
          void submit();
        }}>
        <NFormItem
          label={t("form.username")}
          label-props={{ for: `${formId}-username` }}>
          <NInput
            value={username.value}
            disabled={store.loginPending}
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
            disabled={store.loginPending}
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
            disabled={store.loginPending}
            onUpdateChecked={(checked) => {
              remember.value = checked as boolean;
              clearFeedback();
            }}>
            {t("form.rememberMe")}
          </NCheckbox>
        </NFormItem>
        {store.loginError ? (
          <div role="alert">
            <NP>{store.loginError}</NP>
          </div>
        ) : null}
        <NButton
          attr-type="submit"
          type="primary"
          block
          loading={store.loginPending}
          disabled={store.loginPending}>
          {store.loginPending ? t("form.signingIn") : t("form.signIn")}
        </NButton>
      </NForm>
    );

    return () => {
      const status = store.status;

      if (status.kind === "loading") {
        return (
          <NFlex
            vertical
            justify="center"
            align="center"
            class="min-h-dvh p-6"
            aria-busy="true">
            <NCard class="w-full max-w-md" content-style="padding: 0">
              <div class="sr-only" role="status" aria-live="polite">
                <NH1>{t("loading.title")}</NH1>
                <NP>{t("loading.description")}</NP>
              </div>
              <NSpin show size="large" description={t("loading.description")}>
                <div class="h-48" />
              </NSpin>
            </NCard>
          </NFlex>
        );
      }

      if (status.kind === "authenticated") {
        const description = status.userLabel
          ? t("alreadySignedIn.signedInAs", { user: status.userLabel })
          : t("alreadySignedIn.generic");

        return (
          <NFlex vertical justify="center" align="center" class="min-h-dvh p-6">
            <NCard class="w-full max-w-md" content-style="padding: 0">
              <div class="sr-only" role="status">
                <NH1>{t("alreadySignedIn.title")}</NH1>
                <NP>{description}</NP>
              </div>
              <NResult
                status="success"
                title={t("alreadySignedIn.title")}
                description={description}
              />
            </NCard>
          </NFlex>
        );
      }

      const statusMessageKey = getAnonymousStatusMessageKey(status.reason);
      const anonymousStatusMessage = statusMessageKey
        ? t(statusMessageKey)
        : undefined;

      return (
        <NFlex vertical justify="center" align="center" class="min-h-dvh p-6">
          <NCard class="w-full max-w-md">
            {{
              header: () => (
                <div>
                  <NH1>{t("form.signIn")}</NH1>
                  {anonymousStatusMessage ? (
                    <span role="status">
                      <NElement
                        tag="p"
                        class={"text-(length:--font-size-tiny)"}>
                        {anonymousStatusMessage}
                      </NElement>
                    </span>
                  ) : null}
                </div>
              ),
              default: renderSignInForm,
            }}
          </NCard>
        </NFlex>
      );
    };
  },
  {
    name: "AdminLoginPage",
  },
);
