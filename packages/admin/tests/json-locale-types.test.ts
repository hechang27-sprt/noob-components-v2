import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  generateJsonLocaleTypes,
  pascalCaseTypeName,
  regenerateLocaleTypes,
  scanJsonLocaleFiles,
  type JsonLocaleTypeFile,
} from "../../../tooling/vite/json-locale-types";

/** Absolute path of the admin package's committed generated locale types. */
const generatedFile = new URL(
  "../src/locales/locale-types.generated.ts",
  import.meta.url,
);

describe("generateJsonLocaleTypes", () => {
  it("widens primitives and quotes non-identifier keys", () => {
    const files: JsonLocaleTypeFile[] = [
      {
        name: "Messages",
        content: {
          title: "Hello",
          count: 3,
          pinned: true,
          missing: null,
          "zh-CN": { title: "你好" },
        },
      },
    ];
    const source = generateJsonLocaleTypes(files);
    expect(source).toContain("title: string;");
    expect(source).toContain("count: number;");
    expect(source).toContain("pinned: boolean;");
    expect(source).toContain("missing: null;");
    expect(source).toContain('"zh-CN": {');
  });

  it("emits nested object types with indentation", () => {
    const files: JsonLocaleTypeFile[] = [
      { name: "Shell", content: { form: { submit: "Go", cancel: "Back" } } },
    ];
    const source = generateJsonLocaleTypes(files);
    expect(source).toContain("form: {\n    submit: string;");
  });

  it("emits array types: uniform, mixed, and empty", () => {
    const files: JsonLocaleTypeFile[] = [
      {
        name: "Arrays",
        content: {
          tags: ["a", "b"],
          mixed: [1, "x"],
          empty: [],
        },
      },
    ];
    const source = generateJsonLocaleTypes(files);
    expect(source).toContain("tags: string[];");
    expect(source).toContain("mixed: (number | string)[];");
    expect(source).toContain("empty: never[];");
  });

  it("PascalCases stems including path segments", () => {
    expect(pascalCaseTypeName("admin/foo-bar")).toBe("AdminFooBar");
    expect(pascalCaseTypeName("2fa")).toBe("_2fa");
    expect(pascalCaseTypeName("...")).toBe("File");
  });

  it("emits the file-stem map with default and custom names", () => {
    const files: JsonLocaleTypeFile[] = [
      { name: "AdminShell", content: { en: { ok: "OK" } } },
      { name: "AdminLoginPage", content: { en: { ok: "OK" } } },
    ];
    const source = generateJsonLocaleTypes(files);
    expect(source).toContain("interface LocaleFileMap {");
    expect(source).toContain('"AdminShell": AdminShell;');
    expect(source).toContain('"AdminLoginPage": AdminLoginPage;');

    const custom = generateJsonLocaleTypes(files, { mapName: "MessagesMap" });
    expect(custom).toContain("interface MessagesMap {");
    expect(custom).not.toContain("interface LocaleFileMap {");
  });

  it("throws on type-name collisions", () => {
    const files: JsonLocaleTypeFile[] = [
      { name: "a-b", content: {} },
      { name: "a_b", content: {} },
    ];
    expect(() => generateJsonLocaleTypes(files)).toThrow(/collision/i);
  });

  it("is stable: same input produces identical output", () => {
    const files: JsonLocaleTypeFile[] = [
      { name: "AdminShell", content: { en: { ok: "OK" } } },
      { name: "AdminLoginPage", content: { en: { ok: "OK" } } },
    ];
    const first = generateJsonLocaleTypes(files);
    const second = generateJsonLocaleTypes(files);
    expect(second).toBe(first);
  });
});

describe("regenerateLocaleTypes", () => {
  /** Temp fixture directories created by these tests. */
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  /** Creates an isolated fixture dir with one locale JSON. */
  function fixture(content: unknown): {
    dir: string;
    outFile: string;
    json: string;
  } {
    const dir = mkdtempSync(join(tmpdir(), "json-locale-types-"));
    tmpDirs.push(dir);
    const json = join(dir, "Messages.json");
    writeFileSync(json, JSON.stringify(content));
    return { dir, outFile: join(dir, "generated.ts"), json };
  }

  it("writes the module on first run and reports a change", () => {
    const { dir, outFile } = fixture({ en: { ok: "OK" } });
    expect(regenerateLocaleTypes(dir, outFile)).toBe(true);
    expect(readFileSync(outFile, "utf8")).toContain(
      "export interface Messages {",
    );
  });

  it("is a no-op when already up to date", () => {
    const { dir, outFile } = fixture({ en: { ok: "OK" } });
    regenerateLocaleTypes(dir, outFile);
    expect(regenerateLocaleTypes(dir, outFile)).toBe(false);
  });

  it("picks up type-visible JSON edits and deletions (watchChange path)", () => {
    const { dir, outFile, json } = fixture({ en: { ok: "OK" } });
    regenerateLocaleTypes(dir, outFile);

    // A value-only edit leaves the widened type unchanged (correct no-op);
    // a shape edit must regenerate.
    writeFileSync(json, JSON.stringify({ en: { ok: "OK", extra: true } }));
    expect(regenerateLocaleTypes(dir, outFile)).toBe(true);
    expect(readFileSync(outFile, "utf8")).toContain("extra: boolean;");

    rmSync(json);
    expect(regenerateLocaleTypes(dir, outFile)).toBe(true);
    expect(readFileSync(outFile, "utf8")).not.toContain(
      "export interface Messages",
    );
  });

  it("throws on unparseable JSON naming the file", () => {
    const { dir, outFile, json } = fixture({ en: { ok: "OK" } });
    writeFileSync(json, "{ nope");
    expect(() => regenerateLocaleTypes(dir, outFile)).toThrow(/Messages\.json/);
  });

  it("throws on type-name collisions", () => {
    const { dir, outFile } = fixture({ en: { ok: "OK" } });
    writeFileSync(
      join(dir, "Messages.json"),
      JSON.stringify({ en: { ok: "OK" } }),
    );
    writeFileSync(
      join(dir, "messages.json"),
      JSON.stringify({ en: { ok: "OK" } }),
    );
    expect(() => regenerateLocaleTypes(dir, outFile)).toThrow(/collision/i);
  });

  it("creates missing output directories", () => {
    const { dir } = fixture({ en: { ok: "OK" } });
    const nested = join(dir, "nested", "deeper", "generated.ts");
    expect(regenerateLocaleTypes(dir, nested)).toBe(true);
    expect(existsSync(nested)).toBe(true);
  });
});

describe("committed generated file", () => {
  it("matches a fresh generation from the actual locale resources (no drift)", () => {
    const committed = readFileSync(generatedFile, "utf8");
    const files = scanJsonLocaleFiles(
      fileURLToPath(new URL("../src/locales", import.meta.url)),
    );
    expect(files.length).toBeGreaterThan(0);
    const fresh = generateJsonLocaleTypes(files, {
      sourceDir: "packages/admin/src/locales",
    });
    expect(committed).toBe(fresh);
  });

  it("exposes the exact per-locale shapes admin derives", () => {
    const files = scanJsonLocaleFiles(
      fileURLToPath(new URL("../src/locales", import.meta.url)),
    );
    const source = generateJsonLocaleTypes(files);
    // The admin override contract indexes the en subtree; the generated
    // types must keep the locale keys addressable.
    expect(source).toContain("export interface AdminShell {");
    expect(source).toContain("export interface AdminLoginPage {");
    expect(source).toContain("en: {");
    expect(source).toContain('"zh-CN": {');
  });
});
