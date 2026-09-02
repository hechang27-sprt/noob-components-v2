import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
}

export const HMR_PATCH_VIRTUAL_ID = "virtual:noob-hmr-patch" as const;

/** One patch, bound to the patchId of its owning target. */
interface FilePatchEntry {
  patch: HmrPatch;
  patchId: string;
}

function toSlashes(path: string): string {
  return path.replaceAll("\\", "/");
}

/** Derives an exported client method name: `apply<Id>` / `restore<Id>`. */
function methodName(patchId: string, action: "apply" | "restore"): string {
  const pascal = patchId
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
  return `${action}${pascal}`;
}

export function hmrPatchServer(options: HmrPatchServerOptions): Plugin[] {
  const targets = new Map(options.targets.map((t) => [t.patchId, t]));
  const applied = new Set<string>();
  let server: ViteDevServer | undefined;
  /** Inverse map: resolved file -> its patches (with owning patchIds). */
  let filePatches: Map<string, FilePatchEntry[]> | undefined;

  function workspaceRoot(): string {
    return options.root ?? server?.config.root ?? process.cwd();
  }

  /** Resolves the file a patch applies to (patch.file ?? target.file). */
  function patchFilePath(target: HmrPatchTarget, patch: HmrPatch): string {
    return resolve(workspaceRoot(), patch.file ?? target.file);
  }

  /** The target's primary (default) file. */
  function primaryFilePath(target: HmrPatchTarget): string {
    return resolve(workspaceRoot(), target.file);
  }

  function buildFilePatches(): Map<string, FilePatchEntry[]> {
    const map = new Map<string, FilePatchEntry[]>();
    for (const target of targets.values()) {
      for (const patch of target.patches) {
        const file = toSlashes(patchFilePath(target, patch));
        const entry: FilePatchEntry = { patch, patchId: target.patchId };
        const list = map.get(file);
        if (list) list.push(entry);
        else map.set(file, [entry]);
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
  function pushUpdate(file: string): void {
    if (!server) return;
    const changed = server.moduleGraph.getModuleById(file);
    if (!changed) return;
    // Invalidate every graph node for the file (absolute and /@fs forms)
    // so the patched content is re-transformed on any re-import.
    for (const mod of [
      ...(server.moduleGraph.getModulesByFile(file) ?? []),
    ] as ModuleNode[]) {
      server.moduleGraph.invalidateModule(mod);
    }
    server.moduleGraph.invalidateModule(changed);
    const timestamp = Date.now();
    const boundary = nearestAccepting(changed) ?? changed;
    if (boundary !== changed) server.moduleGraph.invalidateModule(boundary);
    // Self-accepting boundary (the usual case: the patched component): the
    // single proven entry. For non-self-accepting data modules that still
    // have importers, also bump the data module's own URL.
    const updates: ModuleNode[] =
      boundary === changed ? [changed] : [boundary, changed];
    server.ws.send({
      type: "update",
      updates: updates.map((mod) => ({
        type: "js-update" as const,
        path: mod.url,
        acceptedPath: mod.url,
        timestamp,
      })),
    });
  }

  /** BFS over importers; returns the shallowest self-accepting module. */
  function nearestAccepting(start: ModuleNode): ModuleNode | undefined {
    const queue: ModuleNode[] = [start];
    const seen = new Set<string>([start.id ?? start.url]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.isSelfAccepting) return current;
      for (const importer of current.importers) {
        const key = importer.id ?? importer.url;
        if (!seen.has(key)) {
          seen.add(key);
          queue.push(importer);
        }
      }
    }
    return undefined;
  }

  /** Generated virtual-module client (single default export). */
  function virtualClientCode(): string {
    const endpoint = options.endpoint ?? "/__hmr-patch";
    const lines = [
      `const endpoint = ${JSON.stringify(endpoint)};`,
      "async function patch(patchId, patchAction) {",
      "  const res = await fetch(endpoint, {",
      '    method: "POST",',
      '    headers: { "content-type": "application/json" },',
      "    body: JSON.stringify({ patchId, action: patchAction }),",
      "  });",
      "  if (!res.ok) throw new Error(`hmr patch ${patchAction} ${patchId} failed: ${await res.text()}`);",
      "}",
      "const client = {",
    ];
    for (const target of targets.values()) {
      for (const action of ["apply", "restore"] as const) {
        lines.push(
          `  ${methodName(target.patchId, action)}: () => patch(${JSON.stringify(target.patchId)}, ${JSON.stringify(action)}),`,
        );
      }
    }
    lines.push("};", "export default client;");
    return lines.join("\n");
  }

  return [
    {
      name: "noob:hmr-patch",
      enforce: "pre",
      // Keep load active in production builds so patched content is served
      // there too (the middleware is dev-only).
      configureServer(viteServer) {
        server = viteServer;
        filePatches = buildFilePatches();
        const endpoint = options.endpoint ?? "/__hmr-patch";
        viteServer.middlewares.use(endpoint, (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end();
            return;
          }
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => {
            try {
              const { patchId, action } = JSON.parse(body || "{}") as {
                patchId: string;
                action: "apply" | "restore";
              };
              const target = targets.get(patchId);
              if (!target) throw new Error(`unknown patch id ${patchId}`);
              if (action === "apply") applied.add(patchId);
              else if (action === "restore") applied.delete(patchId);
              else throw new Error(`unknown action ${action}`);
              pushUpdate(primaryFilePath(target));
              res.statusCode = 200;
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify({ ok: true, patchId, action }));
            } catch (error) {
              res.statusCode = 500;
              res.setHeader("content-type", "text/plain");
              res.end(error instanceof Error ? error.message : String(error));
            }
          });
        });
      },
      load(id) {
        const entries = filePatches?.get(toSlashes(resolve(id)));
        if (entries && entries.length > 0) {
          const file = resolve(id);
          let source = readFileSync(file, "utf8");
          for (const { patch, patchId } of entries) {
            if (applied.has(patchId)) {
              source = source.replace(patch.find, patch.replace);
            }
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
