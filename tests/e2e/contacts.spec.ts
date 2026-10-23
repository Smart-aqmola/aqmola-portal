import { expect, test } from "@playwright/test";

test.describe("contacts and feedback", () => {
  test("the contacts page shows the operator, the form and the provider desks", async ({
    page,
  }) => {
    await page.goto("/ru/contacts");
    await expect(page.getByRole("heading", { level: 1, name: "Контакты" })).toBeVisible();
    await expect(page.getByText("info@aqmola.test")).toBeVisible();
    await expect(page.getByRole("link", { name: "Открыть на карте" })).toHaveAttribute(
      "href",
      /openstreetmap\.org/,
    );
    await expect(page.getByRole("heading", { level: 3, name: "Водоканал Акмолы" })).toBeVisible();
  });

  test("a question is checked, sent and gets a number", async ({ page }) => {
    await page.goto("/ru");
    const form = page.locator("form").filter({ hasText: "Остались вопросы?" });
    await form.getByRole("button", { name: "Отправить" }).click();
    await expect(form.getByText("Заполните это поле").first()).toBeVisible();
    await expect(form.getByLabel(/^Имя/)).toBeFocused();

    await form.getByLabel(/^Имя/).fill("Айгерим");
    await form.getByLabel(/^Номер телефона/).fill("+7 705 555 12 34");
    await form.getByLabel(/^Тема/).selectOption("idea");
    await form.getByLabel(/^Ваш комментарий/).fill("Добавьте напоминание о поверке счётчика");
    await form.getByRole("checkbox", { name: /персональных данных/ }).check();
    await form.getByRole("button", { name: "Отправить" }).click();
    await expect(page.getByRole("heading", { name: "Сообщение отправлено" })).toBeFocused();
    await expect(page.getByText(/DEMO-FB-\d{4}-00001/).first()).toBeVisible();
  });

  test("the footer leads to the contacts", async ({ page }) => {
    await page.goto("/ru/news");
    await page.getByRole("contentinfo").getByRole("link", { name: "Контакты" }).click();
    await expect(page).toHaveURL(/\/ru\/contacts$/);
  });
});
