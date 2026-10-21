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

/** Adds a cold-water meter with the first reading 120 on the page "My meters". */
async function addWaterMeter(page: Page) {
  await page.goto("/ru/meters");
  await page.getByRole("button", { name: "Добавить прибор" }).click();
  await page.getByLabel(/^Вид ресурса/).selectOption("cold_water");
  await page.getByLabel(/^Тип прибора/).selectOption("mechanical");
  await page.getByLabel(/^Заводской номер/).fill("SN-77");
  await page.getByLabel(/^Дата установки/).fill("2024-05-01");
  await page.getByLabel(/^Показания на сегодня/).fill("120");
  await page.getByRole("button", { name: "Добавить прибор" }).click();
  await expect(page.getByRole("article", { name: "Холодная вода, № SN-77" })).toBeVisible();
}

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

test.describe("meters", () => {
  test("a guest is asked to sign in and is brought back", async ({ page }) => {
    await page.goto("/ru/meters/submit");
    await page.getByRole("main").getByRole("link", { name: "Войти" }).click();
    await expect(page).toHaveURL(/\/ru\/sign-in\?next=%2Fru%2Fmeters%2Fsubmit/);
  });

  test("a reading is sent, waits for the provider and is accepted (demo)", async ({ page }) => {
    await residentWithObject(page);
    await addWaterMeter(page);

    await page
      .getByRole("link", { name: /Передать показания/ })
      .last()
      .click();
    await expect(page).toHaveURL(/\/ru\/meters\/submit\?meter=/);
    await expect(page.getByLabel(/^Прибор учёта/)).not.toHaveValue("");

    // A wrong value is explained, not sent.
    await page.getByLabel(/^Текущие показания/).fill("12a");
    await page.getByRole("checkbox", { name: /достоверны/ }).check();
    await page.getByRole("button", { name: "Отправить показания" }).click();
    await expect(page.getByText("Введите число, например 1234 или 1234,5")).toBeVisible();

    await page.getByLabel(/^Текущие показания/).fill("130");
    await page.getByRole("button", { name: "Отправить показания" }).click();
    await expect(page.getByRole("heading", { name: "Показания отправлены" })).toBeVisible();
    await expect(page.getByText(/Номер: DEMO-POK-\d{4}-00001/)).toBeVisible();

    await page.getByRole("link", { name: "История показаний" }).first().click();
    await expect(page.getByText("Отправлено, но пока не принято поставщиком")).toBeVisible();
    const card = page.getByRole("article").first();
    await card.getByText("Демо: решение поставщика").click();
    await card.getByLabel("Действие").selectOption("accepted");
    await card.getByRole("button", { name: "Применить" }).click();
    await expect(card.getByText("Принято поставщиком, ещё не учтено в начислениях")).toBeVisible();
  });

  test("a lowered reading needs a confirmation and goes to a check", async ({ page }) => {
    await residentWithObject(page);
    await addWaterMeter(page);
    await page.goto("/ru/meters/submit");
    await page.getByLabel(/^Коммунальная услуга/).selectOption("cold_water");
    await page.getByLabel(/^Текущие показания/).fill("100");
    await page.getByRole("checkbox", { name: /достоверны/ }).check();
    await page.getByRole("button", { name: "Отправить показания" }).click();
    await expect(page.getByRole("heading", { name: "Показания меньше предыдущих" })).toBeVisible();

    await page.getByRole("checkbox", { name: /Подтверждаю: показания уменьшились/ }).check();
    await page.getByRole("button", { name: "Отправить показания" }).click();
    await expect(
      page.getByText("Показания уменьшились, поставщик проверит их вручную."),
    ).toBeVisible();
  });

  test("a meter is replaced: the request goes through the provider and the act is downloaded", async ({
    page,
  }) => {
    await residentWithObject(page);
    await addWaterMeter(page);

    await page.goto("/ru/meters/order/replacement");
    await page.getByLabel(/^Коммунальная услуга/).selectOption("cold_water");
    await page.getByLabel(/^Прибор учёта/).selectOption({ label: "Холодная вода, № SN-77" });
    await page.getByLabel(/^Причина/).selectOption("broken");
    await page.getByLabel(/^Сведения о неисправности/).fill("Не крутится");
    await page.getByLabel(/^Текущие показания/).fill("150");
    await page.getByLabel(/^Дата 1/).fill(tomorrow());
    await page.getByLabel(/^Контактный телефон/).fill("+7 701 123 45 67");
    await page.getByRole("button", { name: "Отправить заявку" }).click();
    await expect(page.getByRole("heading", { name: "Заявка отправлена" })).toBeVisible();
    await page.getByRole("link", { name: "Открыть заявку" }).click();

    for (const [action, hint] of [
      ["in_progress", "Специалист принял заявку в работу."],
      ["scheduled", "Назначены дата и специалист."],
      ["done", "Работы выполнены, заявка закрыта. Акт можно скачать."],
    ] as const) {
      await page.getByLabel(/^Действие/).selectOption(action);
      await page.getByRole("button", { name: "Применить" }).click();
      await expect(page.getByText(hint)).toBeVisible();
    }

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Скачать акт" }).click();
    expect((await download).suggestedFilename()).toMatch(/^DEMO-ZPR-\d{4}-00001\.txt$/);

    await page.goto("/ru/meters");
    await expect(page.getByRole("article", { name: "Холодная вода, № SN-77" })).toContainText(
      "Заменён",
    );
    await expect(page.getByRole("article")).toHaveCount(2);

    await page.goto("/ru/meters/requests");
    await expect(page.getByRole("article")).toContainText("Выполнена");
  });

  test("the section fits a phone screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await residentWithObject(page);
    await addWaterMeter(page);
    for (const path of [
      "/ru/meters",
      "/ru/meters/submit",
      "/ru/meters/history",
      "/ru/meters/requests",
      "/ru/meters/order/sealing",
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
