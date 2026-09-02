import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import type { Plugin } from "vite";

import vue from "@vitejs/plugin-vue";
import vueJsxVapor from "vue-jsx-vapor/vite";
import vueDevTools from "vite-plugin-vue-devtools";
import { defineConfig } from "vite";


/**
 * Dev-only middleware backing the demo HMR showcase page.
 *
 * `POST /__hmr-test {pkg, slot, action}` rewrites (or restores) one HMRTest
 * component's own source file or locale JSON under the workspace, so the
 * button clicks in the HMRTest components exercise real Vite HMR — code,
 * tailwind classes, and locale resources — without the e2e touching files
 * directly. The original file content is captured on first edit and restored
 * exactly, leaving the jj working copy clean.
 */
function hmrTestServer(): Plugin {
  const ROOT = resolve(import.meta.dirname, "../..");
  const targets: Record<string, { source: string; locale: string }> = {
    ui: {
      source: "packages/ui/src/components/hmr-test/root.tsx",
      locale: "packages/ui/src/locales/HMRTest.json",
    },
    admin: {
      source: "packages/admin/src/components/hmr-test/root.tsx",
      locale: "packages/admin/src/locales/HMRTest.json",
    },
    demo: {
      source: "apps/demo/src/components/hmr-test/root.tsx",
      locale: "apps/demo/src/locales/demo.json",
    },
  };
  /** Per-package edits: tag literal and tailwind background class swap. */
  const sourceEdits: Record<string, [string, string][]> = {
    ui: [['"ui:base"', '"ui:edited"'], ["bg-amber-100", "bg-sky-100"]],
    admin: [['"admin:base"', '"admin:edited"'], ["bg-lime-100", "bg-pink-100"]],
    demo: [['"demo:base"', '"demo:edited"'], ["bg-emerald-100", "bg-orange-100"]],
  };
  const localeEdit: [string, string][] = [['"status": "base"', '"status": "edited"']];
  const originals = new Map<string, string>();

  /** Derives pristine content even when the file is already edited. */
  function toPristine(text: string, pairs: [string, string][]): string {
    let out = text;
    for (const [, edited] of pairs) out = out.replaceAll(edited, baseOf(pairs, edited));
    return out;
  }
  function baseOf(pairs: [string, string][], edited: string): string {
    return pairs.find(([, e]) => e === edited)?.[0] ?? edited;
  }

  return {
    name: "demo-hmr-test-server",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__hmr-test", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          try {
            const { pkg, slot, action } = JSON.parse(body || "{}") as {
              pkg: string;
              slot: "source" | "locale";
              action: "edit" | "restore";
            };
            const target = targets[pkg]?.[slot];
            if (!target) throw new Error(`unknown target ${pkg}/${slot}`);
            if (action !== "edit" && action !== "restore") {
              throw new Error(`unknown action ${action}`);
            }
            const abs = resolve(ROOT, target);
            const pairs = slot === "source" ? sourceEdits[pkg] : localeEdit;
            if (action === "edit") {
              // Self-healing: derive the pristine baseline from whatever is
              // on disk (already-edited leftovers from a crashed run), then
              // write the deterministic edited content.
              if (!originals.has(abs)) {
                originals.set(abs, toPristine(readFileSync(abs, "utf8"), pairs));
              }
              const pristine = originals.get(abs)!;
              let next = pristine;
              for (const [from, to] of pairs) next = next.replaceAll(from, to);
              writeFileSync(abs, next);
            } else if (originals.has(abs)) {
              writeFileSync(abs, originals.get(abs)!);
            } else {
              // Server restarted mid-run: heal from the current content.
              writeFileSync(abs, toPristine(readFileSync(abs, "utf8"), pairs));
            }
            res.statusCode = 200;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ ok: true }));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("content-type", "text/plain");
            res.end(error instanceof Error ? error.message : String(error));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    vueJsxVapor({ interop: true, macros: true }),
    vueDevTools(),
    hmrTestServer(),
  ],
  build: {
    cssMinify: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          minSize: 50000, // 50KB minimum chunk size
          groups: [
            {
              name: "vue",
              test: /[\\/]node_modules[\\/]vue[\\/]/,
              priority: 20,
            },
            {
              name: "vue-i18n",
              test: /[\\/]node_modules[\\/]vue-i18n[\\/]/,
              priority: 20,
            },
            {
              name: "vue-router",
              test: /[\\/]node_modules[\\/]vue-router[\\/]/,
              priority: 20,
            },
            {
              name: "naive-ui",
              test: /[\\/]node_modules[\\/]naive-ui[\\/]/,
              priority: 20,
            },
            {
              name: "pro-naive-ui",
              test: /[\\/]node_modules[\\/]pro-naive-ui[\\/]/,
              priority: 20,
            },
            {
              name: "pinia",
              test: /[\\/]node_modules[\\/]pinia[\\/]/,
              priority: 20,
            },
            {
              name: "vendor",
              test: /[\\/]node_modules[\\/]/,
              // Keep vendor at the same priority as the named groups; at a
              // lower priority rolldown folds its module set into whichever
              // group chunk references it and no vendor chunk is emitted.
              priority: 20,
            },
            {
              // Workspace libs resolve FROM SOURCE via tsconfigPaths
              // (packages/<pkg>/src/...), so a node_modules-anchored test
              // never matches; also match the package directories. Declaring
              // this group LAST keeps rolldown's tie handling from absorbing
              // the earlier named chunks.
              name: "@noob-naive-ui",
              test: /[\\/](?:node_modules[\\/](?:@noob|@noob-naive-ui)|packages[\\/](?:registry|i18n|ui|admin|admin-vue-router))[\\/]/,
              priority: 20,
              minSize: 0,
            },
          ],
        },
      },
    },
  },
  resolve: {
    // Vite 8 reads tsconfig.json paths — replaces manual JS/TS aliases.
    tsconfigPaths: true,
    // Framework singletons must be single-instance in the bundle: the app's
    // direct deps and the published library dists can otherwise resolve
    // different physical copies (pnpm peer-context variants), which breaks
    // injection keys across the boundary (e.g. vue-router RouterView).
    dedupe: [
      "vue",
      "vue-router",
      "pinia",
      "vue-i18n",
      "naive-ui",
      "pro-naive-ui",
    ],
    // CSS imports need explicit aliases (tsconfigPaths only handles JS/TS).
    alias: [
      {
        find: "@noob-naive-ui/admin/style.css",
        replacement: resolve(
          import.meta.dirname,
          "../../packages/admin/src/style.css",
        ),
      },
      {
        find: "@noob-naive-ui/ui/style.css",
        replacement: resolve(
          import.meta.dirname,
          "../../packages/ui/src/style.css",
        ),
      },
    ],
  },
  server: {
    fs: {
      allow: [resolve(import.meta.dirname, "../..")],
    },
  },
});
