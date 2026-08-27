import { test, expect, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login", { timeout: 10_000 });
  await page.locator("input").nth(0).fill("demo");
  await page.locator("input").nth(1).fill("demo123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/", { timeout: 10_000 });
}

async function switchTheme(page: Page, themeKey: string) {
  await page.evaluate((key) => {
    const app = document.querySelector("#app")?.__vue_app__;
    const pinia = app!.config.globalProperties.$pinia;
    const store = pinia._s.get("admin-shell-preferences");
    const preset = store.runtime.themes.find((t: { key: string }) => t.key === key);
    store.preferences.themeKey = key;
    store.preferences.themeMode = preset.isDark ? "dark" : "light";
  }, themeKey);
  await page.waitForTimeout(2_000);
}

const readBodyBg = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** Read the tab bar background color from the CSS var set on the scroll container. */
const readTabBarBg = (page: Page) =>
  page.evaluate(() => {
    const scroll = document.querySelector("[data-card-tabs-scroll]");
    if (!scroll) return "NO_SCROLL";
    return scroll.style.getPropertyValue("--noob-ui-card-tabs-background-color").trim();
  });

test.describe("Theme switching bugs", () => {
  test("BUG 1: dark→light should update page background", async ({ page }) => {
    await login(page);
    await page.getByRole("menuitem", { name: "Workspace" }).click({ timeout: 3_000 });
    await page.getByRole("menuitem", { name: "Reports" }).click({ timeout: 3_000 });
    await page.waitForTimeout(500);

    const initialBg = await readBodyBg(page);
    console.log("Initial bg:", initialBg);

    await switchTheme(page, "midnight");
    const darkBg = await readBodyBg(page);
    console.log("After dark:", darkBg);
    expect(darkBg).not.toBe(initialBg);

    await switchTheme(page, "default");
    const lightBg = await readBodyBg(page);
    console.log("After light:", lightBg);
    expect(lightBg).toBe(initialBg);
  }, { timeout: 30_000 });

  test("BUG 2: theme switch should update tab bar without refresh", async ({ page }) => {
    await login(page);
    await page.getByRole("menuitem", { name: "Workspace" }).click({ timeout: 3_000 });
    await page.getByRole("menuitem", { name: "Reports" }).click({ timeout: 3_000 });
    await page.waitForTimeout(500);

    const initialBg = await readTabBarBg(page);
    console.log("Initial tab bar bg:", initialBg);

    await switchTheme(page, "midnight");
    const darkBg = await readTabBarBg(page);
    console.log("After dark:", darkBg);
    expect(darkBg).not.toBe(initialBg);

    await switchTheme(page, "default");
    const lightBg = await readTabBarBg(page);
    console.log("After light:", lightBg);
    expect(lightBg).toBe(initialBg);

    await page.reload({ timeout: 10_000 });
    const reloadedBg = await readTabBarBg(page);
    console.log("After reload:", reloadedBg);
    expect(reloadedBg).toBe(initialBg);
  }, { timeout: 30_000 });
});
