import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    actionTimeout: 3_000,
    navigationTimeout: 10_000,
  },
  webServer: {
    command: "pnpm --filter demo dev",
    port: 5173,
    timeout: 60_000,
    reuseExistingServer: true,
  },
});
