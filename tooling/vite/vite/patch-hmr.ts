import { readFileSync, writeFileSync } from "node:fs";
import pathlib from "node:path";
import type { ModuleNode, Plugin, ViteDevServer } from "vite";

/**
 * Reusable dev-server HMR patch tool (plugin preset).
 *
 * Instead of mutating files on disk, targets are patched **when served**:
 * the patch plugin's `load` hook returns the file content with every ACTIVE
 * patch applied. Toggling a patch (apply/restore) only flips in-memory
 * state and re-imports the affected module, so code, tailwind classes, and
 * locale resources exercise the real HMR pipeline with no working-tree
 * writes.
 *
 * Returns two plugins:
 * - `noob:hmr-patch` — endpoint middleware + served-content interception;
 * - `noob:hmr-patch-client` — the `virtual:noob-hmr-patch` module whose
 *   DEFAULT export bundles every `applyX()` / `restoreX()` method (each
 *   wraps the endpoint POST, hiding the transport details).
 */
export interface HmrPatch {
  /** Optional file override; defaults to the target's `file`. */
  file?: string;
  /** The pattern to find in the file content (string or RegExp). */
  find: RegExp | string;
  /** Replacement applied while the patch is active (first match). */
  replace: string;
}

export interface HmrPatchTarget {
  /**
   * Unique patch id — also yields the virtual-module method names
   * (`apply<Id>()` / `restore<Id>()`). One id groups the patches that
   * apply and restore TOGETHER (e.g. a component's tag literal + its
   * tailwind class), so consumers call a single method per concern.
   */
  patchId: string;
  /** Workspace-root-relative primary file whose served module is patched. */
  file: string;
  /** Patches applied in order while this target is active. */
  patches: HmrPatch[];
}

export interface HmrPatchServerOptions {
  /** Targets to intercept; patchIds must be unique. */
  targets: HmrPatchTarget[];
  /** Endpoint served by the middleware (default `/__hmr-patch`). */
  endpoint?: string;
  /** Root used to resolve target `file` paths (default: Vite root). */
  root?: string;
  /**
   * Workspace-root-relative path of the generated ambient declaration for
   * the virtual client (e.g. `apps/demo/src/env.d.ts`). Written by the
   * plugin when the generated content changes; commit the file so plain
   * `tsc` gates work without the dev server.
   */
  dtsFile?: string;
}

export const HMR_PATCH_VIRTUAL_ID = "virtual:noob-hmr-patch" as const;

/** One patch, bound to the patchId of its owning target. */
interface FilePatchEntry {
  patch: HmrPatch;
  patchId: string;
}

function resolve(...paths: string[]): string {
  return pathlib.posix
    .resolve(...paths)
    .replaceAll(pathlib.sep, pathlib.posix.sep);
}

export function hmrPatchServer(options: HmrPatchServerOptions): Plugin[] {
  const byId = new Map(options.targets.map((t) => [t.patchId, t]));
  const applied = new Set<string>();
  let server: ViteDevServer | undefined;
  /** Inverse map: resolved file -> its patches (with owning patchIds). */
  let byFile: Map<string, FilePatchEntry[]> | undefined;

  function workspaceRoot(): string {
    return options.root ?? server?.config.root ?? process.cwd();
  }

  /** Resolves the file a patch applies to (patch.file ?? target.file). */
  function patchFilePath(target: HmrPatchTarget, patch: HmrPatch): string {
    return resolve(workspaceRoot(), patch.file ?? target.file);
  }

  /** The target's primary (default) file. */
  function targetFilePaths(target: HmrPatchTarget): Set<string> {
    const primary = resolve(workspaceRoot(), target.file);
    return new Set([
      primary,
      ...target.patches.flatMap((patch) =>
        patch.file ? resolve(workspaceRoot(), patch.file) : [],
      ),
    ]);
  }

  function buildFilePatches(): Map<string, FilePatchEntry[]> {
    const map = new Map<string, FilePatchEntry[]>();
    for (const target of byId.values()) {
      for (const patch of target.patches) {
        const file = patchFilePath(target, patch);
        const entry: FilePatchEntry = { patch, patchId: target.patchId };
        map.getOrInsertComputed(file, () => []).push(entry);
      }
    }
    return map;
  }

  /**
   * Invalidates the patched module and re-imports it like Vite's own
   * file-change propagation: the changed module when it is self-accepting,
   * otherwise the nearest self-accepting importer (the component that owns
   * the patched content). Pushing the whole importer chain would re-evaluate
   * shell/entry modules and duplicate mounted singletons (naive-ui's
   * NGlobalStyle warning).
   */
  function pushUpdate(files: Iterable<string>): void {
    if (!server) return;
    const _server = server;
    const timestamp = Date.now();

    const mods = new Set(
      Iterator.from(files).flatMap(
        (file) => _server.moduleGraph.getModulesByFile(file)?.values() ?? [],
      ),
    );

    const invalidated = new Set<ModuleNode>();
    const boundaries = findBoundaries(mods, (mod) => {
      // Invalidate every graph node for the file AND EVERY DEPENDENT MODULES UPTO THE SELF-ACCEPTING BOUNDARY
      _server.moduleGraph.invalidateModule(mod, invalidated, timestamp, true);
    });

    const getUpdateType = (mod: ModuleNode) => {
      if (mod.type === "js") return "js-update" as const;
      else if (mod.type === "css") return "css-update" as const;
      else return "js-update" as const;
    };

    // Vite's own boundary emission: path = the re-imported boundary,
    // acceptedPath = the CHANGED module. The client imports the boundary
    // with the timestamp, and vite's import-analysis then stamps the
    // acceptedPath dependency with the same timestamp, forcing a fresh
    // fetch of the changed (patched) module — including locale JSON.
    const msg = {
      type: "update" as const,
      updates: boundaries.map((mod) => ({
        type: getUpdateType(mod),
        path: mod.url,
        acceptedPath: mod.url,
        timestamp,
      })),
    };

    console.debug(msg);
    server.ws.send(msg);
  }

  /** BFS over importers; returns the shallowest self-accepting module. */
  function findBoundaries(
    starts: Iterable<ModuleNode>,
    cb?: (mod: ModuleNode) => void,
  ) {
    const queue = [...starts];
    const seen = new Set();
    const boundaries: ModuleNode[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (seen.has(current)) continue;

      seen.add(current);
      cb?.(current);

      if (current?.isSelfAccepting) {
        boundaries.push(current);
        continue;
      } else {
        current?.importers?.forEach((mod) => queue.push(mod));
      }
    }

    return boundaries;
  }

  /** Generated ambient declaration for the virtual client. */
  function generateDts(): string {
    // NOTE: the import must live INSIDE the declare module block. A
    // top-level import turns the d.ts into an external module and TS stops
    // applying the ambient declaration to the page's import (TS2307).
    return `
/// <reference types="vite/client" />

/**
 * Generated by @noob/tooling-vite hmrPatchServer — do not edit.
 */
declare module ${JSON.stringify(HMR_PATCH_VIRTUAL_ID)} {
  import { useHmrPatchClient } from "@noob/tooling-vite/client";
  export type PatchId = ${byId
    .keys()
    .map((patchId) => `\n      | ${JSON.stringify(patchId)}`)
    .toArray()
    .join("")};

  export const client: ReturnType<typeof useHmrPatchClient<PatchId>>;
}
`;
  }

  /** Generated virtual-module client (single default export). */
  function virtualClientCode(): string {
    const endpoint = options.endpoint ?? "/__hmr-patch";

    return `
import { useHmrPatchClient } from "@noob/tooling-vite/client";
const client = useHmrPatchClient(${JSON.stringify(endpoint)});

export { client }; 
    `;
  }

  return [
    {
      name: "noob:hmr-patch",
      enforce: "pre",
      // Keep load active in production builds so patched content is served
      // there too (the middleware is dev-only).
      configResolved() {
        if (!options.dtsFile) return;
        const generated = generateDts();
        const abs = resolve(
          options.root ?? server?.config.root ?? process.cwd(),
          options.dtsFile,
        );
        if (readFileSync(abs, "utf8") !== generated) {
          writeFileSync(abs, generated);
        }
      },
      configureServer(viteServer) {
        server = viteServer;
        byFile = buildFilePatches();
        const endpoint = options.endpoint ?? "/__hmr-patch";
        viteServer.middlewares.use(endpoint, (req, res) => {
          const error = (errno: number, err?: any) => {
            res.statusCode = errno;
            let msg = "";
            if (err == null) {
            } else if (err instanceof Error) {
              msg = err.message;
            } else {
              msg = String(err);
            }

            if (msg) {
              res.setHeader("content-type", "text/plain");
              res.end(err instanceof Error ? err.message : String(err));
            } else {
              res.end();
            }
          };

          const json = (obj: Record<string, unknown>) => {
            res.statusCode = 200;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify(obj));
          };

          if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", () => {
              try {
                const { patchId, action } = JSON.parse(body || "{}") as {
                  patchId: string;
                  action: "apply" | "restore";
                };
                const target = byId.get(patchId);
                if (!target) throw new Error(`unknown patch id ${patchId}`);
                if (action === "apply") applied.add(patchId);
                else if (action === "restore") applied.delete(patchId);
                else throw new Error(`unknown action ${action}`);

                const paths = targetFilePaths(target);
                pushUpdate(paths);

                return json({ ok: true, patchId, action });
              } catch (err) {
                return error(500, err);
              }
            });
          } else if (req.method === "GET") {
            const url = req.url ? new URL(req.url) : undefined;
            if (!url) return error(400);
            const patchId = url.searchParams.get("patchId");
            if (!patchId) return error(400);
            return json({ ok: true, applied: applied.has(patchId) });
          } else return error(405);
        });
      },
      load(id) {
        const entries = byFile
          ?.get(resolve(id))
          ?.filter(({ patchId }) => applied.has(patchId));

        if (entries && entries.length > 0) {
          console.warn(`${entries?.length} patches loaded for ${id}`);

          const file = resolve(id);
          let source = readFileSync(file, "utf8");
          for (const { patch } of entries) {
            source = source.replace(patch.find, patch.replace);
          }
          return source;
        }
        return undefined;
      },
    },
    {
      name: "noob:hmr-patch-client",
      resolveId(id) {
        return id === HMR_PATCH_VIRTUAL_ID ? id : undefined;
      },
      load(id) {
        return id === HMR_PATCH_VIRTUAL_ID ? virtualClientCode() : undefined;
      },
    },
  ];
}
