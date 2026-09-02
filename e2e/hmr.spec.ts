import { expect, test, type Page } from "@playwright/test";

const PKGS = ["ui", "admin", "demo"] as const;
type Pkg = (typeof PKGS)[number];

/**
 * State that survives HMR but not a full reload:
 * - `scopeId` regenerates on reload (new uuid in main.ts module scope) and
 *   the avr navigation layer then invalidates saved history state;
 * - the marker is wiped with the JS context; open-tab count resets.
 */
async function shellSnapshot(page: Page) {
  return page.evaluate(() => {
    const state = history.state as {
      _noobAdminShell?: { scopeId?: string };
    } | null;
    return {
      scopeId: state?._noobAdminShell?.scopeId ?? null,
      openTabs: document.querySelectorAll('[role="tab"]').length,
      marker:
        (window as unknown as Record<string, unknown>).__noobHmrMarker ?? null,
    };
  });
}

/** Click one HMRTest action button inside a package's showcase card. */
async function clickAction(page: Page, pkg: Pkg, label: string) {
  await page
    .locator(`[data-hmr-test="${pkg}"] button`)
    .filter({ hasText: label })
    .click();
}

const cardTag = (page: Page, pkg: Pkg) =>
  page.locator(`[data-hmr-test="${pkg}"] [data-hmr-tag]`).textContent();
const cardStatus = (page: Page, pkg: Pkg) =>
  page.locator(`[data-hmr-test="${pkg}"] [data-hmr-status]`).textContent();
const cardBg = (page: Page, pkg: Pkg) =>
  page
    .locator(`[data-hmr-test="${pkg}"]`)
    .evaluate((el) => getComputedStyle(el).backgroundColor);

test("HMR test page: source, tailwind css, and locale updates without reload", async ({
  page,
}) => {
  try {
    // --- sign in and open the HMR showcase ------------------------------
    await page.goto("/");
    await page.fill('input[name="username"]', "e2e");
    await page.fill('input[name="password"]', "e2e");
    await page.click('button[type="submit"]');
    await page.waitForSelector("[role='tablist']", { timeout: 15_000 });
    await page
      .locator(".n-menu-item-content-header")
      .filter({ hasText: "Demo" })
      .click();
    await page
      .locator(".n-menu-item-content")
      .filter({ hasText: "HMR test" })
      .first()
      .click();
    await page.waitForSelector('[data-hmr-test="ui"]', { timeout: 15_000 });
    await expect(page.locator("[data-hmr-test]")).toHaveCount(3);

    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).__noobHmrMarker =
        "survive-" + Math.random();
    });
    const before = await shellSnapshot(page);
    expect(before.openTabs).toBeGreaterThanOrEqual(2);

    /** Assert no reload happened during the edit/restore cycle. */
    async function assertSurvived(label: string) {
      expect(await shellSnapshot(page), `${label}: full reload detected`).toEqual(
        before,
      );
    }

    for (const pkg of PKGS) {
      // 1) source edit: tag + tailwind class swap
      const tag0 = await cardTag(page, pkg);
      const bg0 = await cardBg(page, pkg);
      expect(tag0).toBe(`${pkg}:base`);

      await clickAction(page, pkg, "Edit source");
      await page.waitForFunction(
        ([p, tag]) =>
          document
            .querySelector(`[data-hmr-test="${p}"] [data-hmr-tag]`)
            ?.textContent === tag,
        [pkg, `${pkg}:edited`] as const,
      );
      expect(await cardTag(page, pkg)).toBe(`${pkg}:edited`);
      // tailwind regenerates the CSS separately; wait for the applied bg
      await page.waitForFunction(
        ([p, bg]) => {
          const el = document.querySelector(`[data-hmr-test="${p}"]`);
          return !!el && getComputedStyle(el).backgroundColor !== bg;
        },
        [pkg, bg0] as const,
      );
      expect(await cardBg(page, pkg)).not.toBe(bg0);
      await assertSurvived(`code/css: ${pkg}`);

      await clickAction(page, pkg, "Restore source");
      await page.waitForFunction(
        ([p, tag]) =>
          document
            .querySelector(`[data-hmr-test="${p}"] [data-hmr-tag]`)
            ?.textContent === tag,
        [pkg, `${pkg}:base`] as const,
      );
      await assertSurvived(`code/css restore: ${pkg}`);

      // 2) locale edit: status label from the component's locale resource
      expect(await cardStatus(page, pkg)).toBe("base");
      await clickAction(page, pkg, "Edit locale");
      await page.waitForFunction(
        ([p]) =>
          document
            .querySelector(`[data-hmr-test="${p}"] [data-hmr-status]`)
            ?.textContent === "edited",
        [pkg] as const,
      );
      expect(await cardStatus(page, pkg)).toBe("edited");
      await assertSurvived(`locale: ${pkg}`);

      await clickAction(page, pkg, "Restore locale");
      await page.waitForFunction(
        ([p]) =>
          document
            .querySelector(`[data-hmr-test="${p}"] [data-hmr-status]`)
            ?.textContent === "base",
        [pkg] as const,
      );
      await assertSurvived(`locale restore: ${pkg}`);
    }

    // --- positive control: a real reload MUST break the baseline ---------
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    const afterReload = await shellSnapshot(page);
    expect(before.scopeId).not.toBeNull();
    expect(afterReload.scopeId).not.toEqual(before.scopeId);
    expect(afterReload.marker).toBeNull();
  } finally {
    // Guarantee the workspace files are back to their originals even when
    // a step failed (the dev server captures originals on first edit).
    for (const pkg of PKGS) {
      for (const slot of ["source", "locale"] as const) {
        await page
          .request
          .post("http://127.0.0.1:5199/__hmr-test", {
            data: { pkg, slot, action: "restore" },
          })
          .catch(() => undefined);
      }
    }
  }
});
