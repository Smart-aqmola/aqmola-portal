import { expect, test } from "@playwright/test";

test.describe("utility services and portal sections", () => {
  test("shows the fifteen utility services, each with provider, term, documents and an order button", async ({
    page,
  }) => {
    await page.goto("/ru");
    const section = page.getByRole("region", { name: "Коммунальные услуги" });
    await section.scrollIntoViewIfNeeded();
    const cards = section.getByRole("article");
    await expect(cards).toHaveCount(15);

    const contract = cards.filter({ hasText: "Заключение договора на теплоснабжение" });
    await expect(contract).toContainText("Теплосети Акмолы");
    await expect(contract).toContainText("5 раб. дн.");
    await expect(contract).toContainText("Документы:");
    await expect(contract.getByRole("link", { name: "Заказать услугу" })).toHaveAttribute(
      "href",
      "/ru/services/heat-contract/apply",
    );

    const verification = cards.filter({ hasText: "Поверка счётчика" });
    await expect(verification).toContainText("4 500 ₸");
    await expect(verification).toContainText("Нужен визит");
  });

  test("lists the nine sections and links the ones that exist", async ({ page }) => {
    await page.goto("/ru");
    const sections = page.getByRole("region", { name: "Разделы портала" });
    await expect(sections.getByRole("listitem")).toHaveCount(9);
    await sections.getByRole("link", { name: /Коммунальные организации/ }).click();
    await expect(page).toHaveURL(/\/ru\/organizations$/);
  });

  test("the organizations page lists providers with where they work", async ({ page }) => {
    await page.goto("/ru/organizations");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Коммунальные организации");
    const water = page.getByRole("listitem").filter({ hasText: "Водоканал Акмолы" });
    await expect(water).toContainText("Вся область");
    await water.getByRole("link", { name: /Услуги поставщика/ }).click();
    await expect(page).toHaveURL(/\/ru\/services\?organization=akmola-water/);
  });

  test("the help page opens an answer on a click", async ({ page }) => {
    await page.goto("/ru/help");
    await page.getByText("Как зарегистрироваться?").click();
    await expect(page.getByText(/код всегда 123456/)).toBeVisible();
  });

  test("a new utility service is found in the catalog", async ({ page }) => {
    await page.goto("/ru/services?q=перерасчёт");
    await expect(
      page.getByRole("heading", { name: "Подача заявления на перерасчёт", level: 3 }),
    ).toBeVisible();
  });

  test("the home page does not scroll sideways", async ({ page }) => {
    await page.goto("/ru");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
