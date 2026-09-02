import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ModuleNode, Plugin, ViteDevServer } from "vite";

/**
 * Reusable dev-server HMR patch tool.
 *
 * Instead of mutating files on disk, targets are patched **when served**:
 * the plugin's `load` hook returns the file content with the active patch
 * applied. Toggling a patch (apply/restore) only flips in-memory state and
 * invalidates the module so Vite hot-updates the browser — code, tailwind
 * classes, and locale resources all exercise the real HMR pipeline with no
 * working-tree writes.
 *
 * A virtual module (`virtual:noob-hmr-patch`) exposes `applyX()` /
 * `restoreX()` per target; those methods wrap the POST calls to the
 * dev-server endpoint, hiding the transport details from components.
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
   * Unique id — also yields the virtual-module method names (`apply<Id>()`).
   * One id groups the patches that should apply and restore TOGETHER (e.g.
   * a component's tag literal + its tailwind class), so consumers call a
   * single method per concern.
   */
  id: string;
  /** Workspace-root-relative file whose served module is patched on load. */
  file: string;
  /** Patches applied in order while this target is active. */
  patches: HmrPatch[];
}

export interface HmrPatchServerOptions {
  /** Targets to intercept; ids must be unique. */
  targets: HmrPatchTarget[];
  /** Endpoint served by the middleware (default `/__hmr-patch`). */
  endpoint?: string;
  /** Root used to resolve target `file` paths (default: Vite root). */
  root?: string;
}

export const HMR_PATCH_VIRTUAL_ID = "virtual:noob-hmr-patch" as const;

/** Derives an exported client method name: `apply<Id>` / `restore<Id>`. */
function methodName(id: string, action: "apply" | "restore"): string {
  const pascal = id
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
  return `${action}${pascal}`;
}

function toSlashes(path: string): string {
  return path.replaceAll("\\", "/");
}

export function hmrPatchServer(options: HmrPatchServerOptions): Plugin {
  const targets = new Map(options.targets.map((t) => [t.id, t]));
  const applied = new Set<string>();
  let server: ViteDevServer | undefined;

  function workspaceRoot(): string {
    return options.root ?? server?.config.root ?? process.cwd();
  }

  function filePath(target: HmrPatchTarget): string {
    return resolve(workspaceRoot(), target.file);
  }

  /** Resolves the file a patch applies to (patch.file ?? target.file). */
  function patchFilePath(target: HmrPatchTarget, patch: HmrPatch): string {
    return resolve(workspaceRoot(), patch.file ?? target.file);
  }

  /**
   * All targets that patch this module id. A file can belong to several
   * targets (e.g. a component's source target and its locale target both
   * patch root.tsx), so every active target's patches must apply.
   */
  function targetsForFileId(id: string): HmrPatchTarget[] {
    const needle = toSlashes(resolve(id));
    const matched: HmrPatchTarget[] = [];
    for (const target of targets.values()) {
      for (const patch of target.patches) {
        if (toSlashes(patchFilePath(target, patch)) === needle) {
          matched.push(target);
          break;
        }
      }
    }
    return matched;
  }

  /**
   * Invalidates the patched module and pushes the HMR update the same way
   * Vite propagates a file change: re-import the changed module when it is
   * self-accepting, otherwise re-import the nearest self-accepting importer
   * (the component that owns the patched content). Pushing the whole
   * importer chain would re-evaluate shell/entry modules and duplicate
   * mounted singletons (naive-ui's NGlobalStyle warning).
   */
  function pushUpdate(file: string): void {
    if (!server) return;
    const changed = server.moduleGraph.getModuleById(file);
    if (!changed) return;
    // Invalidate every graph node for the file (absolute and /@fs forms)
    // so the patched content is re-transformed on any re-import.
    for (const mod of [
      ...(server.moduleGraph.getModulesByFile(file) ?? []),
    ] as unknown as ModuleNode[]) {
      server.moduleGraph.invalidateModule(mod);
    }
    server.moduleGraph.invalidateModule(changed);
    const timestamp = Date.now();
    const boundary = nearestAccepting(changed) ?? changed;
    // Self-accepting boundary (the usual case: the patched component): the
    // single proven entry. For non-self-accepting data modules that still
    // have importers, also bump the data module's own URL.
    const entries: ModuleNode[] =
      boundary === changed ? [changed] : [boundary, changed];
    server.ws.send({
      type: "update",
      updates: entries.map((mod) => ({
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

  return {
    name: "noob:hmr-patch",
    enforce: "pre",
    // Keep resolveId/load active in production builds so the virtual module
    // resolves there too (the middleware is dev-only; the bundled client is
    // inert without it).
    configureServer(viteServer) {
      server = viteServer;
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
            const { id, action } = JSON.parse(body || "{}") as {
              id: string;
              action: "apply" | "restore";
            };
            const target = targets.get(id);
            if (!target) throw new Error(`unknown patch target ${id}`);
            if (action === "apply") applied.add(id);
            else if (action === "restore") applied.delete(id);
            else throw new Error(`unknown action ${action}`);
            pushUpdate(filePath(target));
            res.statusCode = 200;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ ok: true, id, action }));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("content-type", "text/plain");
            res.end(error instanceof Error ? error.message : String(error));
          }
        });
      });
    },
    resolveId(id) {
      if (id === HMR_PATCH_VIRTUAL_ID) return HMR_PATCH_VIRTUAL_ID;
      return undefined;
    },
    load(id) {
      if (id === HMR_PATCH_VIRTUAL_ID) {
        const endpoint = options.endpoint ?? "/__hmr-patch";
        const lines = [
          `const endpoint = ${JSON.stringify(endpoint)};`,
          "async function patch(id, action) {",
          "  const res = await fetch(endpoint, {",
          '    method: "POST",',
          '    headers: { "content-type": "application/json" },',
          "    body: JSON.stringify({ id, action }),",
          "  });",
          "  if (!res.ok) throw new Error(`hmr patch ${action} ${id} failed: ${await res.text()}`);",
          "}",
        ];
        for (const target of targets.values()) {
          lines.push(
            `export function ${methodName(target.id, "apply")}() { return patch(${JSON.stringify(target.id)}, "apply"); }`,
            `export function ${methodName(target.id, "restore")}() { return patch(${JSON.stringify(target.id)}, "restore"); }`,
          );
        }
        return lines.join("\n");
      }
      const matched = targetsForFileId(id);
      if (matched.length > 0) {
        const file = resolve(id);
        let source = readFileSync(file, "utf8");
        for (const target of matched) {
          if (!applied.has(target.id)) continue;
          for (const patch of target.patches) {
            if (toSlashes(patchFilePath(target, patch)) === toSlashes(file)) {
              source = source.replace(patch.find, patch.replace);
            }
          }
        }
        return source;
      }
      return undefined;
    },
  };
}
