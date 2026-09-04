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
      let res;
      try {
        res = await ofetch(endpoint, {
          method: "GET",
          query: { patchId },
        });
      } catch (error) {
        throw new Error(`get hmr patch ${patchId} status failed`, {
          cause: error,
        });
      }

      if (
        typeof res !== "object" ||
        res.ok !== true ||
        typeof res.applied !== "boolean"
      ) {
        throw new Error(
          `get hmr patch ${patchId} status failed: Invalid response: \n${String(res)}`,
        );
      }

      return res.applied as boolean;
    },
  };
}
