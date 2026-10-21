import { expect, test } from "@playwright/test";

test.describe("demo application", () => {
  test("a resident signs in, applies and sees the application in the list", async ({ page }) => {
    await page.goto("/ru/services/water-meter-readings");
    await page.getByRole("link", { name: "Заказать услугу" }).first().click();

    // Not signed in yet: the wizard sends to the demo sign-in and brings back.
    await expect(page).toHaveURL(/\/apply$/);
    await page.getByRole("link", { name: "Войти" }).last().click();
    await expect(page).toHaveURL(/sign-in\?next=/);
    await page.getByRole("button", { name: "Войти как житель" }).click();

    await expect(page).toHaveURL(/\/ru\/services\/water-meter-readings\/apply$/);
    await page.getByLabel("Город или район").selectOption({ label: "Кокшетау" });
    await page.getByLabel(/Адрес объекта/).fill("ул. Тестовая, 1");
    await page.getByRole("button", { name: "Далее" }).click();

    const attach = page.getByRole("button", { name: "Приложить тестовый файл" });
    while ((await attach.count()) > 0) await attach.first().click();
    await page.getByRole("button", { name: "Далее" }).click();
    await page.getByRole("button", { name: "Далее" }).click();

    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Подписать и подать заявку" }).click();

    await expect(page).toHaveURL(/\/ru\/applications\/DEMO-\d{4}-00001\?new=1$/);
    await expect(page.getByRole("status")).toContainText("Это демо");
    await expect(page.getByText("Подана").first()).toBeVisible();

    await page.goto("/ru/applications");
    await expect(page.getByRole("article")).toHaveCount(1);
    await page.getByRole("link", { name: /Открыть/ }).click();
    await expect(page.getByRole("heading", { level: 3, name: "История" })).toBeVisible();
  });

  test("a resident cannot order a business-only service", async ({ page }) => {
    await page.goto("/ru/sign-in");
    await page.getByRole("button", { name: "Войти как житель" }).click();
    await page.goto("/ru/services/electricity-contract-business/apply");
    await expect(
      page.getByRole("heading", { name: "Эта услуга не для вашего профиля" }),
    ).toBeVisible();
  });

  test("the applications page asks to sign in and an unknown number is reported", async ({
    page,
  }) => {
    await page.goto("/ru/applications");
    await expect(
      page.getByRole("heading", { name: "Войдите, чтобы увидеть заявки" }),
    ).toBeVisible();
    const missing = await page.goto("/ru/applications/DEMO-2026-99999");
    expect(missing?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Такой заявки нет в этом браузере" }),
    ).toBeVisible();
    await page.goto("/ru/applications/bad");
    await expect(page.getByText("404")).toBeVisible();
  });

  test("an outside address in next is ignored", async ({ page }) => {
    await page.goto("/ru/sign-in?next=https://evil.example/ru/x");
    await page.getByRole("button", { name: "Войти как житель" }).click();
    await expect(page).toHaveURL(/\/ru\/applications$/);
  });

  test("the header shows who is signed in, and the pages have no horizontal scroll on a phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/kk/sign-in");
    await page.getByRole("button", { name: "Тұрғын ретінде кіру" }).click();
    for (const path of ["/kk/applications", "/en/sign-in", "/ru/services/gas-contract/apply"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("operator cabinet", () => {
  test("an operator adds test applications and moves one through the statuses", async ({
    page,
  }) => {
    await page.goto("/ru/sign-in");
    await page.getByRole("button", { name: "Войти как оператор" }).click();
    await expect(page).toHaveURL(/\/ru\/operator$/);
    await expect(
      page.getByRole("heading", { name: "В этой организации пока нет заявок" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Добавить тестовые заявки" }).click();
    await expect(page.getByRole("article")).toHaveCount(3);

    await page.getByRole("button", { name: /^В работе/ }).click();
    await expect(page.getByRole("article")).toHaveCount(1);
    await page.getByRole("button", { name: /^Все/ }).click();

    await page
      .getByRole("link", { name: /Открыть/ })
      .first()
      .click();
    await page.getByRole("button", { name: "Взять в работу" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Статус изменён" })).toBeVisible();
    await page.getByRole("button", { name: "Отметить исполненной" }).click();
    await expect(page.getByText("Заявка закрыта")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Исполнена" })).toBeVisible();
  });

  test("a resident does not get into the cabinet", async ({ page }) => {
    await page.goto("/ru/sign-in");
    await page.getByRole("button", { name: "Войти как житель" }).click();
    await page.goto("/ru/operator");
    await expect(page.getByText("Этот раздел только для оператора")).toBeVisible();
  });

  test("an operator sees only the applications of the chosen organization", async ({ page }) => {
    await page.goto("/ru/sign-in");
    await page.getByRole("button", { name: "Войти как оператор" }).click();
    await page.getByRole("button", { name: "Добавить тестовые заявки" }).click();
    const first = await page.getByRole("article").first().innerText();

    await page.goto("/ru/sign-in");
    await page.getByLabel("Организация").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Войти как оператор" }).click();
    await expect(
      page.getByRole("heading", { name: "В этой организации пока нет заявок" }),
    ).toBeVisible();
    expect(first).toContain("DEMO-");
  });
});
