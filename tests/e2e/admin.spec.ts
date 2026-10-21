import { expect, test, type Page } from "@playwright/test";

async function signInAsAdmin(page: Page) {
  await page.goto("/ru/sign-in");
  await page.getByRole("button", { name: "Войти как администратор" }).click();
  await expect(page).toHaveURL(/\/ru\/admin$/);
}

const nav = (page: Page) => page.getByRole("navigation", { name: "Разделы администрирования" });

test.describe("administration of the portal", () => {
  test("only the administrator gets in, and the header leads there", async ({ page }) => {
    await page.goto("/ru/admin");
    await expect(page.getByRole("heading", { name: "Нужен вход администратора" })).toBeVisible();

    await page.goto("/ru/sign-in");
    await page.getByRole("button", { name: "Войти как житель" }).click();
    await page.goto("/ru/admin");
    await expect(page.getByText(/Этот раздел только для администратора/)).toBeVisible();

    await signInAsAdmin(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Администрирование портала" }),
    ).toBeVisible();
    await expect(nav(page).getByRole("link")).toHaveCount(8);
    await expect(
      page.locator("header").getByRole("link", { name: "Демо Администратор" }),
    ).toHaveAttribute("href", "/ru/admin");
  });

  test("the report is shown with filters and downloaded as CSV; XLSX and PDF are not made in the demo", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await nav(page).getByRole("link", { name: "Отчёты" }).click();
    await expect(page.getByRole("row")).toHaveCount(19);
    await page.getByLabel("Организация", { exact: true }).selectOption({ index: 1 });
    await expect(
      page.getByText("Поставщиков, подключённых к порталу").locator("xpath=ancestor::tr"),
    ).toContainText("1");

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Скачать CSV" }).click();
    expect((await download).suggestedFilename()).toBe("report.csv");
    await page.getByRole("button", { name: "Скачать XLSX" }).click();
    await expect(page.getByText("XLSX и PDF в демо не формируются, скачайте CSV")).toBeVisible();
  });

  test("a language can be switched off for everyone and back, but not Russian", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await nav(page).getByRole("link", { name: "Сроки и языки" }).click();
    await page.getByLabel("Қазақша").uncheck();
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByText("Настройки сохранены")).toBeVisible();
    await page.goto("/ru");
    await expect(page.getByRole("group", { name: "Язык" }).getByRole("link")).toHaveCount(1);

    await page.goto("/ru/admin/settings");
    await page.getByLabel("Қазақша").check();
    await page.getByRole("button", { name: "Сохранить" }).click();
    await page.goto("/ru");
    await expect(page.getByRole("group", { name: "Язык" }).getByRole("link")).toHaveCount(2);
  });

  test("a blocked organization is shut out of its cabinet, and the journal remembers who did it", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await nav(page).getByRole("link", { name: "Организации и сотрудники" }).click();
    const card = page.getByRole("article").first();
    const name = (await card.getAttribute("aria-label")) ?? "";
    await card.getByRole("button", { name: "Заблокировать", exact: true }).first().click();
    await card.getByRole("button", { name: "Да, заблокировать" }).click();
    await expect(card.getByText("Заблокирована")).toBeVisible();

    await page.goto("/ru/sign-in");
    await page.getByLabel("Организация").selectOption({ label: name });
    await page.getByRole("button", { name: "Войти как оператор" }).click();
    await expect(
      page.getByRole("heading", { name: "Учётная запись организации заблокирована" }),
    ).toBeVisible();

    await signInAsAdmin(page);
    await page.goto("/ru/admin/audit");
    const row = page.getByRole("row").nth(1);
    await expect(row).toContainText("Демо Администратор");
    await expect(row).toContainText("Изменено: blockedOrganizations");
  });

  test("a text of the administrator is what the person reads in the notifications (16.5)", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await nav(page).getByRole("link", { name: "Тексты уведомлений" }).click();
    await page.getByLabel(/^Русский: registered$/).fill("Добро пожаловать в портал Акмолы!");
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByText("Настройки сохранены")).toBeVisible();

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
    await page.goto("/ru/notifications");
    await expect(page.getByText("Добро пожаловать в портал Акмолы!")).toBeVisible();
  });

  test("the integrations show states and error codes, and the pages fit a phone screen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await signInAsAdmin(page);
    await page.goto("/ru/admin/integrations");
    await expect(page.getByText("Недоступна").first()).toBeVisible();
    for (const path of [
      "/ru/admin",
      "/ru/admin/reports",
      "/ru/admin/organizations",
      "/ru/admin/forms",
      "/ru/admin/settings",
      "/ru/admin/templates",
      "/ru/admin/integrations",
      "/ru/admin/audit",
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
