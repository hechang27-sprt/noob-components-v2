import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

/**
 * Generic JSON → TypeScript type generator.
 *
 * Scans a directory for JSON files and emits a committed TS module with one
 * interface per file plus a file-stem → type map, so consumers can derive
 * message types from the actual resources instead of hand-declaring them.
 * Type-only output: erased at runtime, safe for any build pipeline.
 *
 * Intended for locale message trees: each JSON file is a locale-first
 * resource (e.g. `{ en: {...}, "zh-CN": {...} }`), and consumers index the
 * generated map for the per-locale subtree they need.
 */

/** Absolute directory of this helper module, derived from its own module URL. */
const helperDirectory = dirname(fileURLToPath(import.meta.url));

/** Absolute path of the monorepo root (two levels above `tooling/vite`). */
const workspaceRoot = resolve(helperDirectory, "../..");

/** One JSON payload paired with the stem that names its generated type. */
export interface JsonLocaleTypeFile {
  /** Relative stem without extension, slash-separated (e.g. `admin/Shell`). */
  name: string;
  /** Parsed JSON payload. */
  content: unknown;
}

/** Options for {@link generateJsonLocaleTypes}. */
export interface GenerateJsonLocaleTypesOptions {
  /**
   * Maps a relative stem to the emitted type name. Default: PascalCase of
   * the stem's path segments (e.g. `admin/foo-bar` → `AdminFooBar`).
   */
  typeName?: (stem: string) => string;
  /** Name of the emitted file-stem → type map (default `LocaleFileMap`). */
  mapName?: string;
  /** Directory label embedded in the stable header (relative paths only). */
  sourceDir?: string;
}

/** Options for {@link createJsonLocaleTypesPlugin}. */
export interface CreateJsonLocaleTypesPluginOptions {
  /** Absolute directory scanned recursively for `*.json` files. */
  dir: string;
  /** Absolute output path of the generated TS module. */
  outFile: string;
  /** Forwarded to the generator. */
  typeName?: (stem: string) => string;
  mapName?: string;
}

/** True when `key` is a valid unquoted TypeScript identifier. */
function isIdentifier(key: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
}

/**
 * Converts a JSON value into its widened TypeScript type expression,
 * mirroring `resolveJsonModule` inference: strings widen to `string`,
 * arrays to element-union arrays (`never[]` when empty), objects to inline
 * object types with quoted non-identifier keys. Objects emit multi-line
 * with `indent` applied to member lines.
 */
function tsTypeFor(value: unknown, indent: number): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object": {
      if (Array.isArray(value)) {
        const elementTypes = [
          ...new Set(value.map((v) => tsTypeFor(v, 0))),
        ].sort();
        if (elementTypes.length === 0) return "never[]";
        const inner = elementTypes.join(" | ");
        return elementTypes.length > 1 ? `(${inner})[]` : `${inner}[]`;
      }
      const pad = "  ".repeat(indent);
      const memberPad = "  ".repeat(indent + 1);
      const members = Object.entries(value as Record<string, unknown>).map(
        ([key, member]) =>
          `${memberPad}${isIdentifier(key) ? key : JSON.stringify(key)}: ${tsTypeFor(member, indent + 1)};`,
      );
      return members.length === 0 ? "{}" : `{\n${members.join("\n")}\n${pad}}`;
    }
    default:
      // JSON.parse never produces functions/symbols/undefined at the root,
      // so this branch is unreachable for parsed payloads.
      return "unknown";
  }
}

/** PascalCases a stem's path segments into one valid type identifier. */
export function pascalCaseTypeName(stem: string): string {
  const segments = stem.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const name =
    segments
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join("") || "File";
  // Identifiers cannot start with a digit.
  return /^[0-9]/.test(name) ? `_${name}` : name;
}

/**
 * Generates the TS module source for a set of JSON payloads: one
 * `export interface <TypeName>` per file (widened value types) plus an
 * `export interface <MapName>` mapping every file stem to its type.
 *
 * @param files - Parsed JSON payloads with relative stems.
 * @param options - Naming and header options.
 * @returns The generated module source.
 */
export function generateJsonLocaleTypes(
  files: JsonLocaleTypeFile[],
  options: GenerateJsonLocaleTypesOptions = {},
): string {
  const {
    typeName = pascalCaseTypeName,
    mapName = "LocaleFileMap",
    sourceDir,
  } = options;

  const types = new Map<string, string>();
  const source = [
    `// Auto-generated by tooling/vite/json-locale-types. DO NOT EDIT.`,
  ];
  if (sourceDir) source.push(`// Source: ${sourceDir}`);

  for (const file of files) {
    const name = typeName(file.name);
    const existing = types.get(name);
    if (existing !== undefined) {
      throw new Error(
        `[json-locale-types] Type name collision: "${file.name}" and "${existing}" both map to "${name}". Rename one of the JSON files or provide a custom typeName.`,
      );
    }
    types.set(name, file.name);
    source.push("", `export interface ${name} ${tsTypeFor(file.content, 0)}`);
  }

  source.push(
    "",
    `/** Maps each locale file's relative stem to its generated message type. */`,
    `export interface ${mapName} {`,
    ...files.map(
      (file) => `  ${JSON.stringify(file.name)}: ${typeName(file.name)};`,
    ),
    `}`,
    "",
  );
  return source.join("\n");
}

/** Recursively collects `*.json` files under `dir`, sorted for stability. */
export function scanJsonLocaleFiles(dir: string): JsonLocaleTypeFile[] {
  const files: JsonLocaleTypeFile[] = [];
  for (const entry of readdirSync(dir, {
    recursive: true,
    withFileTypes: true,
  })) {
    const relativePath = entry.name;
    if (!entry.isFile() || extname(relativePath) !== ".json") continue;
    const absolute = join(dir, relativePath);
    let content: unknown;
    try {
      content = JSON.parse(readFileSync(absolute, "utf8")) as unknown;
    } catch (error) {
      throw new Error(
        `[json-locale-types] Failed to parse "${absolute}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    files.push({ name: relativePath.replace(/\.json$/, ""), content });
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Regenerates `outFile` from the JSON files under `dir`.
 *
 * @param dir - Directory scanned recursively for `*.json` files.
 * @param outFile - Absolute output path of the generated TS module.
 * @param options - Naming options forwarded to the generator.
 * @returns True when the file changed, false when it was already up to date.
 * @throws When the directory cannot be scanned or a JSON file fails to
 * parse (the error names the offending file).
 */
export function regenerateLocaleTypes(
  dir: string,
  outFile: string,
  options: { typeName?: (stem: string) => string; mapName?: string } = {},
): boolean {
  const files = scanJsonLocaleFiles(dir);
  const source = generateJsonLocaleTypes(files, {
    ...options,
    sourceDir: relative(workspaceRoot, dir),
  });
  const current = existsSync(outFile) ? readFileSync(outFile, "utf8") : null;
  if (current === source) return false;
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, source, "utf8");
  return true;
}

/**
 * Creates the build-time JSON → TS type plugin: on `buildStart` it scans
 * `dir` for JSON files, generates the type module, and writes `outFile`
 * before the module graph (and any declaration emitter) is processed.
 *
 * Build-time only — it does not watch for changes. Locale JSON edits during
 * dev hot-reload at runtime; the committed output file refreshes on the next
 * server start or build. The output file is committed: plain `tsc --noEmit`
 * and CI typechecks read it without running Vite. Parse errors and name
 * collisions fail the build naming the offending file.
 *
 * @param options - Scan directory, output path, and naming options.
 * @returns The Vite plugin.
 */
export function createJsonLocaleTypesPlugin(
  options: CreateJsonLocaleTypesPluginOptions,
): Plugin {
  const { dir, outFile, typeName, mapName } = options;
  return {
    name: "noob-json-locale-types",
    enforce: "pre",
    async buildStart() {
      if (scanJsonLocaleFiles(dir).length === 0) {
        throw new Error(
          `[json-locale-types] No *.json files found under "${dir}".`,
        );
      }
      regenerateLocaleTypes(dir, outFile, { typeName, mapName });
    },
  };
}
