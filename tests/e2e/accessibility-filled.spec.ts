import { expect, test } from "@playwright/test";
import {
  addConfirmedObject,
  addWaterMeter,
  pageProblems,
  register,
  signInAsOperator,
} from "./helpers";

// The page checks again, now with records on the pages: cards, histories, the open demo panels
// and filled forms are where most of the markup is, and an empty cabinet does not show them.
test("cabinets with records keep their structure for keyboard and screen reader users", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await register(page);
  await addConfirmedObject(page);
  await addWaterMeter(page);
  await page.goto("/ru/appeals/new");
  await page.getByLabel(/^Категория/).selectOption("water_cut");
  await page.getByLabel(/^Объект/).selectOption({ index: 1 });
  await page.getByLabel(/^Что случилось/).fill("Воды нет с утра, соседи тоже без воды");
  await page.getByLabel(/^Контактный телефон/).fill("+7 701 123 45 67");
  await page.getByRole("button", { name: "Отправить обращение" }).click();
  await expect(page.getByText(/Номер обращения: DEMO-OBR/)).toBeVisible();

  const check = async (paths: string[]) => {
    for (const path of paths) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.evaluate(() =>
        document.querySelectorAll("details").forEach((d) => (d.open = true)),
      );
      expect(await pageProblems(page), path).toEqual([]);
    }
  };

  await check([
    "/ru/properties",
    "/ru/meters",
    "/ru/meters/submit",
    "/ru/meters/order/sealing",
    "/ru/billing",
    "/ru/billing/receipt",
    "/ru/billing/pay",
    "/ru/appeals",
    "/ru/notifications",
    "/ru/applications",
    "/kk/meters",
  ]);

  await signInAsOperator(page, "akmola-water");
  await check(["/ru/operator/appeals", "/ru/operator/readings", "/ru/operator/audit"]);
});
