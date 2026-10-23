import { expect, test } from "@playwright/test";

test.describe("my region panel", () => {
  test("shows today, switches the currency and the photo, and leads to the sections", async ({
    page,
  }) => {
    await page.goto("/ru/my-region");
    await expect(page.getByRole("heading", { level: 1, name: "Мой регион" })).toBeAttached();
    await expect(page.getByText("Погода и курс валют — демо-значения")).toBeVisible();

    const photo = page.getByRole("region", { name: "Фото дня" });
    await expect(photo.getByText("Фото 1 из 3")).toBeVisible();
    await photo.getByRole("button", { name: "Следующее фото" }).click();
    await expect(photo.getByText("Фото 2 из 3")).toBeVisible();

    const currency = photo.getByLabel("Валюта");
    const usd = await photo.locator('[aria-live="polite"]').first().innerText();
    await currency.selectOption("EUR");
    await expect(photo.locator('[aria-live="polite"]').first()).not.toHaveText(usd);

    await page.getByRole("link", { name: "Смотреть афишу" }).click();
    await expect(page).toHaveURL(/\/ru\/events$/);
  });

  test("the footer leads to the panel", async ({ page }) => {
    await page.goto("/ru/news");
    await page.getByRole("contentinfo").getByRole("link", { name: "Мой регион" }).click();
    await expect(page).toHaveURL(/\/ru\/my-region$/);
  });
});
