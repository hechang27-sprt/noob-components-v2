import { ofetch } from "ofetch";

export function useHmrPatchClient<const PatchId extends string>(
  endpoint: string,
) {
  return {
    async runPatch(patchId: PatchId, action: "apply" | "restore") {
      try {
        await ofetch(endpoint, {
          method: "POST",
          body: { patchId, action },
        });
      } catch (error) {
        throw new Error(`hmr patch ${action} ${patchId} failed`, {
          cause: error,
        });
      }
    },

    async isApplied(patchId: PatchId) {
      try {
        const res = await ofetch(endpoint, {
          method: "GET",
          query: { patchId },
        });
        return res.applied;
      } catch (error) {
        throw new Error(`get hmr patch ${patchId} status failed`, {
          cause: error,
        });
      }
    },

  };
}
