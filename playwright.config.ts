import { defineConfig } from "@playwright/test";

/**
 * End-to-end HMR verification for the demo app.
 *
 * The test boots the demo dev server, opens tabs, then mutates real
 * workspace source files (code, tailwind classes, locale JSON) across every
 * package and asserts the shell survives:
 * - no full reload: `history.state._noobAdminShell.scopeId` regenerates on
 *   reload and Vue remounts wipe the in-memory HMR marker and clear tabs;
 * - edited files restore exactly in `finally`, leaving the jj working copy
 *   clean.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5199",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "pnpm --filter demo dev --host 127.0.0.1 --port 5199 --strictPort",
    url: "http://127.0.0.1:5199",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
