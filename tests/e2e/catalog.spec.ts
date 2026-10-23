import { expect, test } from "@playwright/test";

test.describe("catalog", () => {
  test("opens with the first page of services for residents", async ({ page }) => {
    await page.goto("/ru/services");
    await expect(page.getByRole("heading", { level: 1, name: "Услуги" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Найдено услуг:");
    await expect(page.getByRole("article")).toHaveCount(12);
    await expect(page.getByRole("radio", { name: "Жителям" })).toBeChecked();
    await expect(page.getByRole("link", { name: "Вперёд" })).toBeVisible();
  });

  test("finds a service by its number", async ({ page }) => {
    await page.goto("/ru/services");
    await page.getByRole("searchbox", { name: "Название или номер услуги" }).fill("1001");
    await page.getByRole("button", { name: "Показать" }).click();

    await expect(page).toHaveURL(/q=1001/);
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 3 })).toContainText(
      "показаний приборов учёта воды",
    );
  });

  test("keeps the filters when the search comes from the home page", async ({ page }) => {
    await page.goto("/ru");
    await page.getByRole("radio", { name: "Бизнесу", includeHidden: true }).check({ force: true });
    await page.getByRole("searchbox", { name: "Что нужно сделать" }).fill("договор");
    await page.getByRole("button", { name: "Найти" }).click();

    await expect(page).toHaveURL(/\/ru\/services\?/);
    await expect(page.getByRole("radio", { name: "Бизнесу" })).toBeChecked();
    await expect(page.getByRole("searchbox", { name: "Название или номер услуги" })).toHaveValue(
      "договор",
    );
    const titles = await page.getByRole("heading", { level: 3 }).allInnerTexts();
    expect(titles.length).toBeGreaterThan(0);
    for (const title of titles) expect(title.toLowerCase()).toContain("договор");
  });

  test("filters by category and marks the chosen chip", async ({ page }) => {
    await page.goto("/ru/services");
    const chips = page.getByRole("navigation", { name: "Категории услуг" });
    await chips.getByRole("link", { name: /Теплоснабжение/ }).click();

    await expect(page).toHaveURL(/category=heat/);
    await expect(chips.getByRole("link", { name: /Теплоснабжение/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(page.getByRole("article").first()).toBeVisible();
  });

  test("explains an empty result and clears the filters", async ({ page }) => {
    await page.goto("/ru/services?q=самолёт");
    await expect(page.getByRole("heading", { name: "Ничего не найдено" })).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);

    await page.getByRole("link", { name: "Сбросить фильтры" }).last().click();
    await expect(page).toHaveURL(/\/ru\/services$/);
    await expect(page.getByRole("article")).toHaveCount(12);
    await expect(page.getByRole("searchbox", { name: "Название или номер услуги" })).toHaveValue(
      "",
    );
  });

  test("moves to the next page", async ({ page }) => {
    await page.goto("/ru/services");
    const first = await page.getByRole("heading", { level: 3 }).first().innerText();
    await page.getByRole("link", { name: "Вперёд" }).click();

    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole("link", { name: "Страница 2" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await page.getByRole("heading", { level: 3 }).first().innerText()).not.toBe(first);
  });

  test("a life situation has its own page with categories, services and the other situations", async ({
    page,
  }) => {
    await page.goto("/ru/situations");
    await page.getByRole("link", { name: /Приборы учёта и показания/ }).click();
    await expect(page).toHaveURL(/\/ru\/situations\/meters$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Приборы учёта и показания");

    const categories = page.getByRole("navigation", { name: "Категории услуг" });
    // On a phone the list is folded into one line, as on the reference site.
    const fold = categories.locator("summary");
    if (await fold.isVisible()) await fold.click();
    const all = categories.getByRole("link", { name: /^Все/ }).first();
    await expect(all).toHaveAttribute("aria-current", "true");
    const total = Number((await page.getByRole("status").innerText()).replace(/\D/g, ""));
    expect(total).toBeGreaterThan(0);

    const first = categories.getByRole("link").nth(1);
    const name = (await first.innerText()).split("\n")[0];
    await first.click();
    await expect(page).toHaveURL(/\?category=/);
    if (await fold.isVisible()) await fold.click();
    await expect(categories.getByRole("link", { name: new RegExp(name) }).first()).toHaveAttribute(
      "aria-current",
      "true",
    );

    await expect(
      page.getByRole("heading", { level: 2, name: "Другие жизненные ситуации" }),
    ).toBeVisible();
    await page.getByRole("link", { name: /Договоры, лицевые счета и ЕПД/ }).click();
    await expect(page).toHaveURL(/\/ru\/situations\/contracts$/);
  });

  test("an unknown life situation is a missing page", async ({ page }) => {
    const response = await page.goto("/ru/situations/space");
    expect(response?.status()).not.toBe(500);
    await expect(page.getByText("404")).toBeVisible();
  });

  test("tells with a message that a service was added to and removed from favorites", async ({
    page,
  }) => {
    await page.goto("/ru/services");
    const toasts = page.getByRole("log");
    await page.getByRole("button", { name: "Добавить в избранное" }).first().click();
    await expect(toasts).toContainText("Добавлено в избранное");

    await page.getByRole("button", { name: "Убрать из избранного" }).first().click();
    await expect(toasts).toContainText("Убрано из избранного");
    await expect(toasts).toBeEmpty({ timeout: 6000 });
  });

  test("keeps the breadcrumbs on one line on a phone, cutting a long title", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/ru/services/water-meter-readings/apply");
    const trail = page.getByRole("navigation", { name: "Вы здесь" });
    const box = await trail.boundingBox();
    // One row of links, not three rows with large gaps between them.
    expect(box!.height).toBeLessThanOrEqual(56);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("scrolls the category chips with the arrow and hides it at the end", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/ru/services");
    const arrow = page.getByRole("button", { name: "Ещё категории" });
    const list = page.getByRole("navigation", { name: "Категории услуг" }).getByRole("list");
    await expect(arrow).toBeVisible();

    const before = await list.evaluate((element) => element.scrollLeft);
    await arrow.click();
    await expect.poll(() => list.evaluate((element) => element.scrollLeft)).toBeGreaterThan(before);

    await list.evaluate((element) => element.scrollTo({ left: element.scrollWidth }));
    await expect(arrow).toHaveCount(0);
  });

  test("speaks Kazakh", async ({ page }) => {
    await page.goto("/kk/services");
    await expect(page.getByRole("heading", { level: 1, name: "Қызметтер" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Көрсету" })).toBeVisible();
  });

  test("has no horizontal scroll on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of ["/kk/services", "/en/services/gas-contract"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("service page", () => {
  test("opens from a card and shows the steps, documents and facts", async ({ page }) => {
    await page.goto("/ru/services?q=опломбировка водомера");
    await page.getByRole("link", { name: "Подробнее" }).first().click();

    await expect(page).toHaveURL(/\/ru\/services\/water-meter-sealing$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Опломбировка водомера" }),
    ).toBeVisible();
    // This service needs a visit, so the list has seven steps.
    await expect(
      page.getByRole("list").filter({ hasText: "Войдите в демо-кабинет" }).getByRole("listitem"),
    ).toHaveCount(7);
    await expect(page.getByRole("heading", { name: "Какие документы понадобятся" })).toBeVisible();
    await expect(page.getByRole("complementary")).toContainText("Водоканал Акмолы");
    await expect(page.getByRole("complementary")).toContainText("Нужен визит");
  });

  test("leads back to the catalog through the breadcrumbs", async ({ page }) => {
    await page.goto("/ru/services/gas-contract");
    const crumbs = page.getByRole("navigation", { name: "Вы здесь" });
    await expect(crumbs.getByRole("link", { name: "Главная" })).toHaveAttribute("href", "/ru");
    await crumbs.getByRole("link", { name: "Услуги" }).click();
    await expect(page).toHaveURL(/\/ru\/services$/);
  });

  test("suggests other services of the same situation", async ({ page }) => {
    await page.goto("/ru/services/water-meter-readings");
    await expect(page.getByRole("heading", { name: /Другие услуги: Приборы учёта/ })).toBeVisible();
    await expect(
      page.locator("section").filter({ hasText: "Другие услуги" }).getByRole("article"),
    ).toHaveCount(3);
  });

  test("an unknown service is a 404", async ({ page }) => {
    const response = await page.goto("/ru/services/no-such-service");
    expect(response?.status()).toBe(404);
  });

  test("a service can be saved to favorites and stays saved after reload", async ({ page }) => {
    await page.goto("/ru/services/gas-contract");
    await page.getByRole("button", { name: "Добавить в избранное" }).first().click();
    await expect(
      page.getByRole("button", { name: "Убрать из избранного" }).first(),
    ).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(page.getByRole("button", { name: "Убрать из избранного" }).first()).toBeVisible();

    await page.getByRole("button", { name: "Убрать из избранного" }).first().click();
    await expect(page.getByRole("button", { name: "Добавить в избранное" }).first()).toBeVisible();
  });
});
