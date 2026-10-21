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
  await expect(page).toHaveURL(/\/ru\/applications$/);
}

test.describe("registration and phone sign in", () => {
  test("a resident registers, signs out and comes back by phone number", async ({ page }) => {
    await register(page);
    await expect(page.getByRole("link", { name: "Иванов Иван" })).toBeVisible();

    await page.goto("/ru/sign-in");
    await page.getByRole("button", { name: "Выйти" }).click();

    await page.getByLabel(/Номер мобильного телефона/).fill("+7 (701) 123-45-67");
    await page.getByRole("button", { name: "Получить код" }).click();
    await page.getByLabel(/Код из SMS/).fill("123456");
    await page.getByRole("button", { name: "Войти", exact: true }).click();

    await expect(page).toHaveURL(/\/ru\/applications$/);
    await expect(page.getByRole("link", { name: "Иванов Иван" })).toBeVisible();
  });

  test("the form names what is wrong and keeps the person on the page", async ({ page }) => {
    await page.goto("/ru/sign-up");
    await page.getByRole("button", { name: "Получить код" }).click();
    await expect(page.getByText("Заполните это поле").first()).toBeVisible();
    await expect(page.getByLabel(/Фамилия/)).toBeFocused();
    await expect(page).toHaveURL(/\/ru\/sign-up$/);
  });

  test("an unknown number is sent to registration", async ({ page }) => {
    await page.goto("/ru/sign-in");
    await page.getByLabel(/Номер мобильного телефона/).fill("+7 702 000 00 00");
    await page.getByRole("button", { name: "Получить код" }).click();
    await expect(page.getByText("Этот номер не зарегистрирован.")).toBeVisible();
    await page.getByRole("link", { name: "Зарегистрироваться" }).click();
    await expect(page).toHaveURL(/\/ru\/sign-up$/);
  });

  test("eGov and signature buttons are there but honest about not working", async ({ page }) => {
    await page.goto("/ru/sign-in");
    // aria-disabled keeps the button focusable and clickable on purpose, so it can explain itself.
    await page.getByRole("button", { name: "Войти через eGov" }).click({ force: true });
    await expect(page.getByRole("log")).toContainText("Не подключено (демо)");
    await expect(page).toHaveURL(/\/ru\/sign-in$/);
  });

  test("the registration page does not scroll sideways", async ({ page }) => {
    await page.goto("/ru/sign-up");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("the phone menu offers registration to a guest and not to someone signed in", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "On a wide bar the menu is not shown; the sign-in page links instead");
    await page.goto("/ru");
    await page.getByRole("button", { name: "Открыть меню" }).click();
    await expect(page.getByRole("link", { name: "Регистрация" })).toBeVisible();

    await page.goto("/ru/sign-in");
    await page.getByRole("button", { name: "Войти как житель" }).click();
    await page.goto("/ru");
    await page.getByRole("button", { name: "Открыть меню" }).click();
    await expect(page.getByRole("link", { name: "Регистрация" })).toHaveCount(0);
  });

  test("the sign-in page offers registration on every screen", async ({ page }) => {
    await page.goto("/ru/sign-in");
    await page.getByRole("link", { name: "Зарегистрироваться" }).click();
    await expect(page).toHaveURL(/\/ru\/sign-up$/);
  });
});
