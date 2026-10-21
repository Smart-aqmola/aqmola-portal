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

test.describe("charges and payment", () => {
  test("a guest is asked to sign in and is brought back", async ({ page }) => {
    await page.goto("/ru/billing/pay");
    await page.getByRole("main").getByRole("link", { name: "Войти" }).click();
    await expect(page).toHaveURL(/\/ru\/sign-in\?next=%2Fru%2Fbilling%2Fpay/);
  });

  test("charges, the single receipt and a payment from start to the confirmation", async ({
    page,
  }) => {
    await residentWithObject(page);

    // The section is reached from the tile of the home page.
    await page.goto("/ru");
    await page
      .getByRole("link", { name: /Начисления и оплата/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/ru\/billing$/);
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("Всего к оплате")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Данные временно недоступны" })).toBeVisible();

    await page.getByRole("link", { name: "Единая квитанция" }).first().click();
    await expect(page.getByRole("article")).toContainText("Общая сумма к оплате");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Скачать квитанцию (демо)" }).click();
    expect((await download).suggestedFilename()).toMatch(/^receipt-\d{4}-\d{2}\.txt$/);

    // Pay: everything that can be paid is chosen; the service without fresh data is not.
    await page.getByRole("link", { name: "Перейти к оплате" }).click();
    await expect(page.getByText("Данные поставщика недоступны")).toBeVisible();
    await page.getByRole("button", { name: "Перейти к оплате" }).click();
    await expect(page).toHaveURL(/\/ru\/billing\/payments\/[a-z0-9-]{36}$/);
    await expect(page.getByText("Ожидает оплаты").first()).toBeVisible();

    await page.getByRole("button", { name: "Перейти в платёжный сервис" }).click();
    await expect(page.getByText("Платёж инициирован").first()).toBeVisible();
    for (const result of ["processing", "paid"]) {
      await page.getByLabel(/^Результат платежа/).selectOption(result);
      await page.getByRole("button", { name: "Сообщить порталу" }).click();
    }
    await expect(page.getByText("Успешно оплачен").first()).toBeVisible();

    // The same notice again changes nothing.
    await page.getByRole("button", { name: "Повторить последнее уведомление" }).click();
    await expect(page.getByText("Это уведомление уже учтено, платёж не задвоен.")).toBeVisible();

    const confirmation = page.waitForEvent("download");
    await page.getByRole("button", { name: "Скачать подтверждение оплаты (демо)" }).click();
    expect((await confirmation).suggestedFilename()).toMatch(/^DEMO-PAY-\d{4}-00001\.txt$/);

    // The paid services have nothing left to pay on the charges page and in the history.
    await page.goto("/ru/billing/payments");
    await expect(page.getByRole("article")).toContainText("Успешно оплачен");
    await page.goto("/ru/billing/pay");
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });

  test("the section fits a phone screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await residentWithObject(page);
    for (const path of [
      "/ru/billing",
      "/ru/billing/receipt",
      "/ru/billing/pay",
      "/ru/billing/payments",
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
