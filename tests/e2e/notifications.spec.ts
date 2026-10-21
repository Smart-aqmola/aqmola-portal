import { expect, test, type Page } from "@playwright/test";

async function register(page: Page) {
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
}

test.describe("notifications", () => {
  test("a guest has no bell and is asked to sign in on the page", async ({ page }) => {
    await page.goto("/ru");
    await expect(page.locator("header").getByRole("link", { name: /^Уведомления/ })).toHaveCount(0);
    await page.goto("/ru/notifications");
    await expect(
      page.getByRole("heading", { name: "Войдите, чтобы увидеть уведомления" }),
    ).toBeVisible();
  });

  test("the bell counts what is new and the page marks it as read", async ({ page }) => {
    await register(page);
    // The registration itself is the first notice.
    const bell = page.getByRole("link", { name: /^Уведомления, непрочитанных: 1$/ });
    await expect(bell).toBeVisible();
    await bell.click();
    await expect(page).toHaveURL(/\/ru\/notifications$/);
    await expect(page.getByText(/Вы зарегистрированы на портале/)).toBeVisible();
    await expect(page.getByText("Новое")).toBeVisible();

    await page.getByRole("button", { name: "Отметить все прочитанными" }).click();
    await expect(page.getByText("Новое")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Уведомления", exact: true })).toBeVisible();

    // A new event brings a new notice, and it survives a reload.
    await page.goto("/ru/appeals/new");
    await page.getByLabel(/^Категория/).selectOption("other");
    await page.getByLabel(/^Адрес/).fill("Кокшетау, улица Абая, 5");
    await page.getByLabel(/^Что случилось/).fill("Во дворе яма, никто не чинит");
    await page.getByLabel(/^Контактный телефон/).fill("+7 701 123 45 67");
    await page.getByRole("button", { name: "Отправить обращение" }).click();
    await expect(page.getByRole("heading", { name: "Обращение отправлено" })).toBeVisible();
    await page.reload();
    await page.goto("/ru/notifications");
    await expect(page.getByText(/Обращение DEMO-OBR-\d{4}-00001 зарегистрировано/)).toBeVisible();
  });

  test("the header stays inside a phone screen with the bell and large text", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await register(page);
    await page.getByRole("button", { name: "Настройки вида" }).click();
    await page.getByRole("checkbox", { name: "Крупный шрифт" }).check();
    await page.goto("/ru");
    await expect(page.locator("header").getByRole("link", { name: /^Уведомления/ })).toBeVisible();
    const controls = page.locator("header").getByRole("link").or(page.locator("header button"));
    for (const control of await controls.all()) {
      const box = await control.boundingBox();
      if (!box) continue;
      const name = (await control.getAttribute("aria-label")) ?? (await control.innerText());
      expect(box.x + box.width, name).toBeLessThanOrEqual(375);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("the header keeps every control on a laptop in Kazakh with large text", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await register(page);
    await page.getByRole("button", { name: "Настройки вида" }).click();
    await page.getByRole("checkbox", { name: "Крупный шрифт" }).check();
    await page.goto("/kk");
    const controls = page.locator("header").getByRole("link").or(page.locator("header button"));
    for (const control of await controls.all()) {
      const box = await control.boundingBox();
      if (!box) continue;
      const name = (await control.getAttribute("aria-label")) ?? (await control.innerText());
      expect(box.x + box.width, name).toBeLessThanOrEqual(1280);
    }
  });
});
