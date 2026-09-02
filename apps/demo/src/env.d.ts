/// <reference types="vite/client" />

/**
 * Typing for the dev-only patch client injected by the demo Vite config
 * (`hmrPatchServer` from @noob/tooling-vite). Method names derive from the
 * configured patch target ids.
 */
declare module "virtual:noob-hmr-apply" {
  export function applyUiSource(): Promise<void>;
  export function applyUiLocale(): Promise<void>;
  export function applyAdminSource(): Promise<void>;
  export function applyAdminLocale(): Promise<void>;
  export function applyDemoSource(): Promise<void>;
  export function applyDemoLocale(): Promise<void>;
}

declare module "virtual:noob-hmr-restore" {
  export function restoreUiSource(): Promise<void>;
  export function restoreUiLocale(): Promise<void>;
  export function restoreAdminSource(): Promise<void>;
  export function restoreAdminLocale(): Promise<void>;
  export function restoreDemoSource(): Promise<void>;
  export function restoreDemoLocale(): Promise<void>;
}
