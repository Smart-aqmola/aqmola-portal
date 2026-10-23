import { expect, test } from "@playwright/test";

test.describe("surveys", () => {
  test("a resident takes a survey once and sees the results with their answer", async ({
    page,
  }) => {
    await page.goto("/ru/surveys");
    await expect(page.getByRole("heading", { level: 1, name: "Опросы" })).toBeVisible();
    await page.getByRole("link", { name: "Раздельный сбор мусора" }).first().click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Раздельный сбор мусора" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Приступить" }).click();
    await page.getByRole("button", { name: "Отправить ответ" }).click();
    await expect(page.getByText("Ответьте на этот вопрос")).toBeVisible();
    await page.getByRole("radio", { name: "Если будет удобно" }).check();
    await page.getByRole("button", { name: "Отправить ответ" }).click();

    await expect(page.getByRole("tab", { name: "Результаты и влияние" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByText("· ваш ответ")).toBeVisible();
    await expect(page.getByText("Вы уже прошли этот опрос")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Вы уже прошли этот опрос")).toBeVisible();
    await expect(page.getByRole("button", { name: "Приступить" })).toHaveCount(0);
  });

  test("a finished survey shows its results and a category narrows the list", async ({ page }) => {
    await page.goto("/ru/surveys?category=tourism");
    await expect(
      page.getByRole("navigation", { name: "Категории" }).getByRole("link", { name: "Туризм" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 2, name: "Завершённые" })).toBeVisible();
    await page.getByRole("link", { name: "Поездка в Бурабай летом" }).click();
    await expect(page.getByRole("button", { name: "Приступить" })).toHaveCount(0);
    await page.getByRole("tab", { name: "Результаты и влияние" }).click();
    await expect(page.getByText("50%")).toBeVisible();
  });
});
