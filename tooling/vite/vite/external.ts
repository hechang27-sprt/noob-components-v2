import { readFileSync } from "node:fs";
import { isBuiltin } from "node:module";

export interface ExternalFromPackageJsonOptions {
  /** Extra specifiers or regexes that are always treated as external. */
  extra?: (string | RegExp)[];
}

/**
 * Builds a rolldown `external` predicate from a library's own package.json
 * dependency fields, so `dependencies`, `peerDependencies`, and
 * `optionalDependencies` are never inlined into the JS bundle, while
 * `devDependencies` (build tooling like vite) stay bundleable.
 *
 * Exact matches and subpaths of each dependency are externalized
 * (`"vue-i18n"` also covers `"vue-i18n/dist/..."`), and Node builtins are
 * always kept external.
 */
export function externalFromPackageJson(
  pkgPath: string,
  options: ExternalFromPackageJsonOptions = {},
): (id: string) => boolean {
  const pkg = JSON.parse(
    readFileSync(pkgPath, "utf8"),
  ) as Record<string, Record<string, string> | undefined>;
  const own = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
  ]);
  const matchers = [...own, ...(options.extra ?? [])] as (string | RegExp)[];
  return (id: string) => {
    if (isBuiltin(id)) return true;
    return matchers.some((m) =>
      typeof m === "string"
        ? id === m || id.startsWith(`${m}/`)
        : m.test(id),
    );
  };
}
