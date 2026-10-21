import { expect, test, type Page } from "@playwright/test";

/** Registers a resident, adds an object in Kokshetau and confirms it through the demo state service. */
async function residentWithObject(page: Page) {
  await page.goto("/ru/sign-up");
  await page.getByLabel(/Фамилия/).fill("Иванов");
  await page.getByLabel(/^Имя/).fill("Иван");
  await page.getByLabel(/^ИИН/).fill("900101300123");
  await page.getByLabel(/Номер мобильного телефона/).fill("8 701 123 45 67");
  await page.getByRole("checkbox", { name: /персональных данных/ }).check();
  await page.getByRole("button", { name: "Получить код" }).click();
  await page.getByLabel(/Код из SMS/).fill("123456");
  await page.getByRole("button", { name: "Подтвердить и создать кабинет" }).click();
  await expect(page).toHaveURL(/\/ru\/properties$/);

  await page.goto("/ru/properties/new");
  const search = page.getByRole("combobox", { name: "Поиск адреса" });
  await search.fill("абая");
  await search.press("ArrowDown");
  await search.press("Enter");
  await page.getByLabel(/^Дом/).fill("10");
  await page.getByLabel(/^Квартира/).fill("5");
  await page.getByLabel(/^Тип объекта/).selectOption("apartment");
  await page.getByLabel(/^Ваша роль/).selectOption("owner");
  await page.getByRole("button", { name: "Сохранить объект" }).click();
  await page.getByRole("button", { name: "Подтвердить через госсервис" }).click();
  await expect(page.getByRole("heading", { name: "Объект подтверждён" })).toBeVisible();
}

test.describe("the cabinet of an organization", () => {
  test("an employee takes an appeal of a resident and the journal remembers it", async ({
    page,
  }) => {
    await residentWithObject(page);

    // The resident writes about the water; the appeal goes to the water provider of the address.
    await page.goto("/ru/appeals/new");
    await page.getByLabel(/^Категория/).selectOption("water_cut");
    await page.getByLabel(/^Объект/).selectOption({ index: 1 });
    await page.getByLabel(/^Что случилось/).fill("Воды нет с утра, соседи тоже без воды");
    await page.getByLabel(/^Контактный телефон/).fill("+7 701 123 45 67");
    const goesTo = await page.getByText(/Обращение уйдёт в организацию:/).innerText();
    const organization = goesTo.replace("Обращение уйдёт в организацию: ", "").trim();
    await page.getByRole("button", { name: "Отправить обращение" }).click();
    await expect(page.getByRole("heading", { name: "Обращение отправлено" })).toBeVisible();

    // The employee of that organization sees it, and only it.
    await page.goto("/ru/sign-in");
    await page.getByLabel("Организация").selectOption({ label: organization });
    await page.getByRole("button", { name: "Войти как оператор" }).click();
    await expect(page).toHaveURL(/\/ru\/operator$/);
    await page
      .getByRole("navigation", { name: "Разделы кабинета организации" })
      .getByRole("link", { name: "Обращения" })
      .click();
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByText(/Воды нет с утра/)).toBeVisible();

    const card = page.getByRole("article");
    await card.getByText("Демо: решение организации").click();
    await card.getByLabel(/^Действие/).selectOption("accepted");
    await card.getByRole("button", { name: "Применить" }).click();
    await expect(card.getByText("Принято в работу").first()).toBeVisible();

    await page
      .getByRole("navigation", { name: "Разделы кабинета организации" })
      .getByRole("link", { name: "Журнал действий" })
      .click();
    const row = page.getByRole("row").nth(1);
    await expect(row).toContainText("Демо Оператор");
    await expect(row).toContainText("Обращение");
    await expect(row).toContainText("Направлено исполнителю → Принято в работу");

    // Another organization sees nothing of this.
    await page.goto("/ru/sign-in");
    await page.getByLabel("Организация").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Войти как оператор" }).click();
    await page.goto("/ru/operator/appeals");
    await expect(page.getByRole("article")).toHaveCount(0);
    await page.goto("/ru/operator/audit");
    await expect(page.getByText("Действий пока нет.")).toBeVisible();
  });

  test("the sections fit a phone screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/ru/sign-in");
    await page.getByRole("button", { name: "Войти как оператор" }).click();
    for (const path of [
      "/ru/operator",
      "/ru/operator/contracts",
      "/ru/operator/meters",
      "/ru/operator/readings",
      "/ru/operator/appeals",
      "/ru/operator/payments",
      "/ru/operator/calendar",
      "/ru/operator/audit",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
