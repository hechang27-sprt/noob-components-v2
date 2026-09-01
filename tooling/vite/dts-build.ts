import { dts } from "rolldown-plugin-dts";
import type { Options } from "rolldown-plugin-dts";

/**
 * Declaration-emission plugin factory that only runs in production builds.
 *
 * `dts()` returns plain rolldown plugins; without `apply: "build"` they also
 * run inside Vitest's dev server, whose `buildStart` lacks a build input and
 * crashes with "Cannot convert undefined or null to object". Vite honors
 * `apply` per plugin, so every plugin from the factory is wrapped here.
 *
 * Usage mirrors `dts()`: `dtsForBuild({ tsconfig: "./tsconfig.json" })`.
 */
export function dtsForBuild(options: Options) {
  // Never pass build: true here. composite: true (which project references
  // force) would switch the generator into its incremental tsc -b mode,
  // whose emit lands per-file inside dist and gets served instead of the
  // fused index.d.ts bundle (and races with rolldown's chunking). The
  // single-program path below fuses the entry graph deterministically.
  return dts(options).map((plugin) => ({ ...plugin, apply: "build" as const }));
}
