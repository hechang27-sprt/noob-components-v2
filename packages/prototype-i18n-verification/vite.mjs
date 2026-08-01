import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Absolute package root directory, derived from this helper's own module URL
 * so the locale glob stays correct no matter which consumer imports it.
 */
const packageRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Glob of the prototype package's component locale JSON resources.
 *
 * Source-consuming workspace hosts (which compile this package from source
 * without a prebuild) add this value to the `@intlify/unplugin-vue-i18n`
 * `include` option so the package's `src/locales/**` JSON is precompiled.
 * Consumers of the built package must not include library source resources;
 * the library build already precompiles them into its dist output.
 */
export const prototypeI18nResourceInclude = resolve(
  packageRoot,
  "src/locales/**",
);
