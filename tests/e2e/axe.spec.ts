import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  addConfirmedObject,
  addWaterMeter,
  publicPages,
  register,
  signInAsOperator,
} from "./helpers";

/**
 * Finds problems for people who see poorly or not at all without checking by hand: axe-core runs
 * the WCAG 2.2 A and AA rules (contrast, names, roles, landmarks, forms, …) on every page.
 */
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Without motion the elements that fade in are measured at their final colours, not halfway.
test.use({ reducedMotion: "reduce" });

async function scan(page: Page) {
  await page.waitForLoadState("networkidle");
  // Details are opened so their content is checked too.
  await page.evaluate(() =>
    document.querySelectorAll("details").forEach((item) => (item.open = true)),
  );
  const result = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return result.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help} — ${violation.nodes
        .slice(0, 3)
        .map((node) => `${node.target.join(" ")} ${node.any[0]?.message ?? ""}`)
        .join(" | ")}`,
  );
}

test.describe("axe: WCAG 2.2 AA on every page", () => {
  for (const path of publicPages) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeAttached();
      expect(await scan(page)).toEqual([]);
    });
  }
});

test.describe("axe: the dark theme and large text", () => {
  for (const path of [
    "/ru",
    "/ru/services",
    "/ru/events",
    "/ru/my-region",
    "/ru/contacts",
    "/ru/sign-in",
  ]) {
    test(path, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: "dark", reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:3100${path}`);
      await page.evaluate(() => {
        localStorage.setItem(
          "aqmola:display",
          JSON.stringify({ theme: "dark", large: true, contrast: false }),
        );
      });
      await page.reload();
      await expect(page.getByRole("heading", { level: 1 })).toBeAttached();
      expect(await scan(page)).toEqual([]);
      await context.close();
    });
  }
});

test("axe: cabinets with records", async ({ page }) => {
  test.setTimeout(120_000);
  await register(page);
  await addConfirmedObject(page);
  await addWaterMeter(page);
  for (const path of [
    "/ru/properties",
    "/ru/meters",
    "/ru/meters/submit",
    "/ru/billing",
    "/ru/billing/pay",
    "/ru/appeals/new",
    "/ru/notifications",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await scan(page), path).toEqual([]);
  }
  await signInAsOperator(page, "akmola-water");
  for (const path of ["/ru/operator/contracts", "/ru/operator/readings"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await scan(page), path).toEqual([]);
  }
});
