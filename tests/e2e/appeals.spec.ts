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

test.describe("appeals and the register of requests", () => {
  test("a guest is asked to sign in and is brought back", async ({ page }) => {
    await page.goto("/ru/appeals/new");
    await page.getByRole("main").getByRole("link", { name: "Войти" }).click();
    await expect(page).toHaveURL(/\/ru\/sign-in\?next=%2Fru%2Fappeals%2Fnew/);
  });

  test("an appeal goes from the form through the organization's questions to the answer", async ({
    page,
  }) => {
    await residentWithObject(page);

    await page.goto("/ru");
    await page
      .getByRole("link", { name: /Обращения и жалобы/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/ru\/appeals$/);
    await page.getByRole("link", { name: "Новое обращение" }).first().click();

    await page.getByLabel(/^Категория/).selectOption("power_cut");
    await page.getByLabel(/^Объект/).selectOption({ index: 1 });
    await page.getByLabel(/^Что случилось/).fill("Света нет с утра, соседи тоже без света");
    await page.getByLabel(/^Дата/).fill("2026-10-20");
    await page.getByLabel(/^Сколько длилось/).fill("5");
    await expect(page.getByText(/Обращение уйдёт в организацию:/)).toBeVisible();
    await page.getByRole("button", { name: "Отправить обращение" }).click();
    await expect(page.getByRole("heading", { name: "Обращение отправлено" })).toBeVisible();
    await expect(page.getByText(/Номер обращения: DEMO-OBR-\d{4}-00001/)).toBeVisible();
    await page.getByRole("link", { name: "Открыть обращение" }).click();

    // The organization (demo) takes it, asks a question, and the person answers.
    await page.getByLabel(/^Действие/).selectOption("accepted");
    await page.getByRole("button", { name: "Применить" }).click();
    await expect(page.getByText("Организация приняла обращение в работу.")).toBeVisible();
    await page.getByLabel(/^Действие/).selectOption("info_required");
    await page.getByRole("button", { name: "Применить" }).click();
    await expect(page.getByText(/Организация просит дополнить обращение/).first()).toBeVisible();

    // The register of requests asks for the answer too (spec 10.5).
    await page.goto("/ru/applications");
    await expect(page.getByRole("link", { name: "Ответить организации" })).toBeVisible();
    await page.getByRole("link", { name: "Ответить организации" }).click();

    await page.getByLabel(/^Ваше сообщение/).fill("С восьми утра");
    await page.getByRole("button", { name: "Отправить", exact: true }).click();
    await expect(page.getByText("Организация рассматривает обращение.")).toBeVisible();

    await page.getByLabel(/^Действие/).selectOption("answer_ready");
    await page.getByRole("button", { name: "Применить" }).click();
    await expect(page.getByRole("heading", { name: "Ответ организации" })).toBeVisible();
    await page.getByRole("button", { name: "Закрыть обращение" }).click();
    await expect(page.getByText("Обращение закрыто.").first()).toBeVisible();

    await page.goto("/ru/applications");
    await page.getByLabel(/^Показать/).selectOption("archive");
    await expect(page.getByRole("article")).toHaveCount(1);
  });

  test("the pages fit a phone screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await residentWithObject(page);
    for (const path of ["/ru/appeals", "/ru/appeals/new", "/ru/applications"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
