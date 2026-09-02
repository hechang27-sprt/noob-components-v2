/** Internal vite helper plugins for the monorepo (never published). */
export {
  createJsonLocaleTypesPlugin,
  generateJsonLocaleTypes,
  pascalCaseTypeName,
  regenerateLocaleTypes,
  scanJsonLocaleFiles,
  type CreateJsonLocaleTypesPluginOptions,
  type GenerateJsonLocaleTypesOptions,
  type JsonLocaleTypeFile,
} from "./json-locale-types.ts";
export { dtsForBuild } from "./dts-build.ts";
export {
  externalFromPackageJson,
  type ExternalFromPackageJsonOptions,
} from "./external.ts";

export {
  hmrPatchServer,
  HMR_PATCH_VIRTUAL_IDS,
  type HmrPatch,
  type HmrPatchTarget,
  type HmrPatchServerOptions,
} from "./patch-hmr.ts";
