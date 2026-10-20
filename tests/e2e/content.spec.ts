import { expect, test } from "@playwright/test";

test.describe("news", () => {
  test("shows the latest news, four to a page", async ({ page }) => {
    await page.goto("/ru/news");
    await expect(page.getByRole("heading", { level: 1, name: "Новости" })).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(4);
    await expect(page.getByRole("link", { name: "Последние" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await page.getByRole("link", { name: "Вперёд" }).click();
    await expect(page).toHaveURL(/page=2/);
  });

  test("filters by topic and switches to the popular tab", async ({ page }) => {
    await page.goto("/ru/news");
    await page
      .getByRole("navigation", { name: "Темы новостей" })
      .getByRole("link", { name: "Город и район" })
      .click();
    await expect(page).toHaveURL(/topic=city/);
    await expect(page.getByRole("article")).toHaveCount(2);

    await page.getByRole("link", { name: "Популярные" }).click();
    await expect(page).toHaveURL(/tab=popular/);
    await expect(page).toHaveURL(/topic=city/);
  });

  test("searches and explains an empty result", async ({ page }) => {
    await page.goto("/ru/news");
    await page.getByRole("searchbox", { name: "Поиск по новостям" }).fill("набережную");
    await page.getByRole("button", { name: "Найти" }).click();
    await expect(page.getByRole("article")).toHaveCount(1);

    await page.goto("/ru/news?q=самолёт");
    await expect(page.getByRole("heading", { name: "Новостей не найдено" })).toBeVisible();
  });

  test("opens an article with its photo credit and other news", async ({ page }) => {
    await page.goto("/ru/news/stepnogorsk-embankment");
    await expect(
      page.getByRole("heading", { level: 1, name: "В Степногорске благоустроили набережную" }),
    ).toBeVisible();
    await expect(page.getByText("Wikimedia Commons")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Другие новости" })).toBeVisible();
    expect((await page.goto("/ru/news/no-such-news"))?.status()).toBe(404);
  });

  test("the home page link leads here and Kazakh works", async ({ page }) => {
    await page.goto("/ru");
    await page.getByRole("link", { name: "Все новости" }).click();
    await expect(page).toHaveURL(/\/ru\/news$/);
    await page.goto("/kk/news");
    await expect(page.getByRole("heading", { level: 1, name: "Жаңалықтар" })).toBeVisible();
  });
});

test.describe("tourism and about", () => {
  test("lists the places and opens one with a link to the district services", async ({ page }) => {
    await page.goto("/ru/tourism");
    await expect(page.getByRole("article")).toHaveCount(6);
    await page.getByRole("link", { name: "Зеренда" }).first().click();
    await expect(page).toHaveURL(/\/ru\/tourism\/zerenda$/);
    await expect(page.getByRole("heading", { level: 1, name: "Зеренда" })).toBeVisible();
    await page.getByRole("link", { name: "Открыть каталог" }).click();
    await expect(page).toHaveURL(/territory=zerendi/);
    expect((await page.goto("/ru/tourism/nowhere"))?.status()).toBe(404);
  });

  test("the about page counts cities and districts", async ({ page }) => {
    await page.goto("/ru/about");
    await expect(page.getByRole("heading", { level: 1, name: "О регионе" })).toBeVisible();
    await expect(page.getByText("3 города областного значения и 17 районов")).toBeVisible();
  });

  test("the footer links no longer lead to a missing page", async ({ page }) => {
    for (const path of ["/ru/situations", "/ru/about", "/ru/news", "/ru/tourism"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
    }
  });

  test("has no horizontal scroll on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of [
      "/kk/news",
      "/en/news/heating-season-started",
      "/ru/tourism",
      "/ru/tourism/burabay",
      "/ru/about",
    ]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("translated content", () => {
  test("a service page speaks Kazakh and English", async ({ page }) => {
    await page.goto("/kk/services/gas-contract");
    await expect(
      page.getByRole("heading", { level: 1, name: "Газбен жабдықтау шартын жасасу" }),
    ).toBeVisible();
    await page.goto("/en/services/gas-contract");
    await expect(
      page.getByRole("heading", { level: 1, name: "Concluding a gas supply contract" }),
    ).toBeVisible();
  });

  test("news and places speak English", async ({ page }) => {
    await page.goto("/en/news/heating-season-started");
    await expect(
      page.getByRole("heading", { level: 1, name: "The heating season has started in the region" }),
    ).toBeVisible();
    await page.goto("/kk/tourism/burabay");
    await expect(page.getByText("Бурабай көлдерімен")).toBeVisible();
  });

  test("the catalog search finds a service by its English title", async ({ page }) => {
    await page.goto("/en/services?q=gas supply contract");
    await expect(page.getByRole("article")).toHaveCount(1);
  });
});
