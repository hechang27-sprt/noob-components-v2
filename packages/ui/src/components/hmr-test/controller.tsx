import { computed, defineComponent, reactive, useId, watch } from "vue";
import {
  DataStateStatus,
  defineMutationOptions,
  defineQueryOptions,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryCache,
  type UseQueryOptions,
} from "@pinia/colada";
import { useHmrPatchClient } from "@noob/tooling-vite/client";
import { zip } from "es-toolkit";
import { NButton, NFlex, NP, NSpin } from "naive-ui";
import {
  createComponentI18n,
  getComponentI18n,
  I18nText,
  resolveI18nText,
} from "@noob-naive-ui/i18n";
import messages from "../../locales/HMRController.json";

export const COMPONENT_ID = "HMRController";

type Props = {
  endpoint: string;
  patchIds: string[];
  labels: I18nText[];
};

type TogglePatchAction = "apply" | "restore";

const HMRButton = defineComponent(
  (
    props: {
      status: UseQueryOptions<boolean, Error, undefined>;
      toggle: UseMutationOptions<void, { action: TogglePatchAction }, Error>;
      label: I18nText;
    },
    ctx: {
      emit: (e: "update:status", status: DataStateStatus) => void;
    },
  ) => {
    const { t } = getComponentI18n();
    const status = useQuery(props.status);
    const toggle = useMutation(props.toggle);

    const _status = computed(() => {
      if (status.data === undefined) return undefined;
      return status.data.value !== toggle.isLoading.value;
    });

    watch(status.status, (status) => ctx.emit("update:status", status), {
      immediate: true,
    });

    return () => {
      if (_status.value === undefined) return null;

      const label = resolveI18nText(props.label, t);
      const applyLabel = t("apply", { label });
      const restoreLabel = t("restore", { label });
      return (
        <NButton
          onClick={() =>
            toggle.mutate({ action: _status.value ? "restore" : "apply" })
          }>
          {_status.value ? restoreLabel : applyLabel}
        </NButton>
      );
    };
  },
  { name: "HMRButton", emits: ["update:status"] },
);

export const HMRController = defineComponent(
  (props: Props) => {
    const { t } = createComponentI18n({
      messages,
      libraryId: "noob-naive-ui:ui",
      componentId: "HMRController",
    });

    const { isApplied, runPatch } = useHmrPatchClient(props.endpoint);
    const labelMap = computed(() => {
      const len = Math.min(props.patchIds.length, props.labels.length);
      const ids = props.patchIds.slice(0, len);
      const labels = props.labels.slice(0, len);
      return new Map(zip(ids, labels));
    });

    const groupId = useId();

    const PATCH_STATUS_QUERY_KEY = {
      root: ["patch-status", groupId] as const,
      byId: (patchId: string) =>
        [...PATCH_STATUS_QUERY_KEY.root, patchId] as const,
    };

    const TOGGLE_PATCH_QUERY_KEY = {
      root: ["toggle-patch", groupId] as const,
      byId: (patchId: string) =>
        [...TOGGLE_PATCH_QUERY_KEY.root, patchId] as const,
    };

    const queryCache = useQueryCache();
    const patchStatusQuery = defineQueryOptions(
      ({ patchId }: { patchId: string }) => ({
        key: PATCH_STATUS_QUERY_KEY.byId(patchId),
        query: () => isApplied(patchId),
      }),
    );

    const togglePatchQuery = defineMutationOptions(
      ({ patchId }: { patchId: string }) => ({
        key: TOGGLE_PATCH_QUERY_KEY.byId(patchId),
        mutation: ({ action }: { action: TogglePatchAction }) =>
          runPatch(patchId, action),
        onSuccess: () =>
          queryCache.invalidateQueries({
            key: PATCH_STATUS_QUERY_KEY.byId(patchId),
          }),
      }),
    );

    const statusMap = reactive(new Map<string, DataStateStatus>());
    const isPending = computed(() =>
      statusMap.values().every((status) => status === "pending"),
    );
    const isError = computed(() =>
      statusMap.values().some((status) => status === "error"),
    );

    return () => (
      <>
        {isError.value ? (
          <NFlex justify="center" align="center">
            <NP>{t("error")}</NP>
          </NFlex>
        ) : null}
        {isPending.value && !isError.value ? (
          <NFlex justify="center" align="center">
            <NSpin />
          </NFlex>
        ) : null}
        <NFlex
          justify="space-between"
          v-show={!isPending.value && !isError.value}>
          {props.patchIds.map((patchId) => (
            <HMRButton
              label={
                labelMap.value.get(patchId) ?? {
                  kind: "string",
                  value: "unknown",
                }
              }
              status={patchStatusQuery({ patchId })}
              toggle={togglePatchQuery({ patchId })}
              onUpdate:status={(status: DataStateStatus) =>
                statusMap.set(patchId, status)
              }
            />
          ))}
        </NFlex>
      </>
    );
  },
  { name: "UiHMRInternal" },
);
