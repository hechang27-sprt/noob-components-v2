/// <reference types="vite/client" />

/**
 * Typing for the dev-only patch client injected by the demo Vite config
 * (`hmrPatchServer` from @noob/tooling-vite). Method names derive from the
 * configured patch target ids.
 */
declare module "virtual:noob-hmr-patch" {
  const client: {
    applyUiSource(): Promise<void>;
    restoreUiSource(): Promise<void>;
    applyUiLocale(): Promise<void>;
    restoreUiLocale(): Promise<void>;
    applyAdminSource(): Promise<void>;
    restoreAdminSource(): Promise<void>;
    applyAdminLocale(): Promise<void>;
    restoreAdminLocale(): Promise<void>;
    applyDemoSource(): Promise<void>;
    restoreDemoSource(): Promise<void>;
    applyDemoLocale(): Promise<void>;
    restoreDemoLocale(): Promise<void>;
  };
  export default client;
}
