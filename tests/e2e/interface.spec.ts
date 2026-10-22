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

test.describe("requirements for the interface (18)", () => {
  test("the language is switched without losing what was typed (18.9)", async ({ page }) => {
    await register(page);
    await page.goto("/ru/appeals/new");
    await page.getByLabel(/^Категория/).selectOption("power_cut");
    await page.getByLabel(/^Адрес/).fill("Кокшетау, улица Абая, 5");
    await page.getByLabel(/^Что случилось/).fill("Света нет с утра, соседи тоже без света");

    await page.getByRole("group", { name: "Язык" }).getByRole("link", { name: "ҚАЗ" }).click();
    await expect(page).toHaveURL(/\/kk\/appeals\/new$/);
    await expect(page.getByLabel(/^Мекенжай/)).toHaveValue("Кокшетау, улица Абая, 5");
    await expect(page.getByLabel(/^Не болды/)).toHaveValue(
      "Света нет с утра, соседи тоже без света",
    );
    await expect(page.getByLabel(/^Санат/)).toHaveValue("power_cut");

    // And back again.
    await page.getByRole("group", { name: "Тіл" }).getByRole("link", { name: "РУС" }).click();
    await expect(page.getByLabel(/^Адрес/)).toHaveValue("Кокшетау, улица Абая, 5");
  });

  test("a form that was sent forgets its draft", async ({ page }) => {
    await register(page);
    await page.goto("/ru/appeals/new");
    await page.getByLabel(/^Категория/).selectOption("other");
    await page.getByLabel(/^Адрес/).fill("Кокшетау, улица Абая, 5");
    await page.getByLabel(/^Что случилось/).fill("Во дворе яма, никто не чинит");
    await page.getByLabel(/^Контактный телефон/).fill("+7 701 123 45 67");
    await page.getByRole("button", { name: "Отправить обращение" }).click();
    await expect(page.getByRole("heading", { name: "Обращение отправлено" })).toBeVisible();
    await page.goto("/ru/appeals/new");
    await expect(page.getByLabel(/^Адрес/)).toHaveValue("");
  });

  test("the registration form keeps its data when the language changes", async ({ page }) => {
    await page.goto("/ru/sign-up");
    await page.getByLabel(/Фамилия/).fill("Иванов");
    await page.getByLabel(/^ИИН/).fill("900101300123");
    await page.getByRole("group", { name: "Язык" }).getByRole("link", { name: "ҚАЗ" }).click();
    await expect(page).toHaveURL(/\/kk\/sign-up$/);
    await expect(page.getByLabel(/^Тегі/)).toHaveValue("Иванов");
    await expect(page.getByLabel(/^ЖСН/)).toHaveValue("900101300123");
  });

  test("an address that leads nowhere says so in plain words and in the language of the address (18.8)", async ({
    page,
  }) => {
    // The page streams, so the status is already sent when the missing item is found.
    await page.goto("/kk/applications/bad");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Бет табылмады" })).toBeVisible();
    await page.getByRole("link", { name: "Басты бетке" }).click();
    await expect(page).toHaveURL(/\/kk$/);
  });
});
