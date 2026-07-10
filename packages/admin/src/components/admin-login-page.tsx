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
import { defineComponent, ref, useId, type PropType } from "vue";

import type {
  AdminAuthActions,
  AdminAuthStatus,
  AdminLoginValues,
} from "../runtime-contract";

export type AdminLoginPageProps = {
  authStatus: AdminAuthStatus;
  authActions: AdminAuthActions;
};

function getAnonymousStatusMessage(
  reason: Extract<AdminAuthStatus, { kind: "anonymous" }>["reason"],
): string | undefined {
  switch (reason) {
    case "expired":
      return "Your session expired. Sign in again to continue.";
    case "forbidden":
      return "You do not have access to that page. Sign in with a different account.";
    case "signed-out":
      return "You have signed out.";
    case "unknown":
      return "Sign in to continue.";
    default:
      return undefined;
  }
}

export const AdminLoginPage = defineComponent(
  (props: AdminLoginPageProps) => {
    const formId = useId();
    const username = ref("");
    const password = ref("");
    const remember = ref(false);
    const isPending = ref(false);
    const errorMessage = ref<string>();
    const isSuccessful = ref(false);

    function clearFeedback(): void {
      errorMessage.value = undefined;
      isSuccessful.value = false;
    }

    async function submit(): Promise<void> {
      if (isPending.value) {
        return;
      }

      clearFeedback();
      isPending.value = true;

      const values: AdminLoginValues = {
        username: username.value,
        password: password.value,
        remember: remember.value,
      };

      try {
        await props.authActions.login(values);
        isSuccessful.value = true;
      } catch {
        errorMessage.value = "Unable to sign in. Please try again.";
      } finally {
        isPending.value = false;
      }
    }

    return () => {
      if (props.authStatus.kind === "loading") {
        return (
          <main
            class="grid min-h-dvh place-items-center p-6 max-sm:items-start max-sm:p-4"
            aria-busy="true"
          >
            <NCard class="w-full max-w-md" content-style="padding: 0">
              <h1 class="sr-only">Checking your session</h1>
              <p class="sr-only" role="status" aria-live="polite">
                Checking your session…
              </p>
              <NSpin show size="large" description="Checking your session…">
                <div class="h-48" />
              </NSpin>
            </NCard>
          </main>
        );
      }

      if (props.authStatus.kind === "authenticated") {
        const description = props.authStatus.userLabel
          ? `Signed in as ${props.authStatus.userLabel}.`
          : "You are already signed in.";

        return (
          <main class="grid min-h-dvh place-items-center p-6 max-sm:items-start max-sm:p-4">
            <NCard class="w-full max-w-md" content-style="padding: 0">
              <h1 class="sr-only">Already signed in</h1>
              <p class="sr-only" role="status">
                {description}
              </p>
              <NResult
                status="success"
                title="Already signed in"
                description={description}
              />
            </NCard>
          </main>
        );
      }

      const anonymousStatusMessage = getAnonymousStatusMessage(
        props.authStatus.reason,
      );

      return (
        <main class="grid min-h-dvh place-items-center p-6 max-sm:items-start max-sm:p-4">
          <NCard class="w-full max-w-md">
            <h1 class="mb-5 text-xl font-semibold">Sign in</h1>
            <NForm
              aria-busy={isPending.value}
              onSubmit={(event: Event) => {
                event.preventDefault();
                void submit();
              }}
            >
              {anonymousStatusMessage ? (
                <p class="mb-4 text-sm" role="status">
                  {anonymousStatusMessage}
                </p>
              ) : null}
              <NFormItem
                label="Username"
                label-props={{ for: `${formId}-username` }}
              >
                <NInput
                  value={username.value}
                  disabled={isPending.value}
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
                label="Password"
                label-props={{ for: `${formId}-password` }}
              >
                <NInput
                  type="password"
                  value={password.value}
                  disabled={isPending.value}
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
                  disabled={isPending.value}
                  onUpdateChecked={(checked) => {
                    remember.value = checked as boolean;
                    clearFeedback();
                  }}
                >
                  Remember me
                </NCheckbox>
              </NFormItem>
              {errorMessage.value ? (
                <p class="mb-4 text-sm" role="alert">
                  {errorMessage.value}
                </p>
              ) : null}
              {isSuccessful.value ? (
                <p class="mb-4 text-sm" role="status">
                  Sign-in request completed.
                </p>
              ) : null}
              <NButton
                attr-type="submit"
                type="primary"
                block
                loading={isPending.value}
                disabled={isPending.value}
              >
                {isPending.value ? "Signing in…" : "Sign in"}
              </NButton>
            </NForm>
          </NCard>
        </main>
      );
    };
  },
  {
    name: "AdminLoginPage",
    props: {
      authStatus: {
        type: Object as PropType<AdminAuthStatus>,
        required: true,
      },
      authActions: {
        type: Object as PropType<AdminAuthActions>,
        required: true,
      },
    },
  },
);
