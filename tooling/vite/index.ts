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
export { createWorkspaceVueI18nPlugin } from "./vue-i18n.ts";
export { dtsForBuild } from "./dts-build.ts";
export {
  externalFromPackageJson,
  type ExternalFromPackageJsonOptions,
} from "./external.ts";
