import { expect, test } from "@playwright/test";

test.describe("events poster", () => {
  test("shows the sections, filters by genre and opens an event", async ({ page }) => {
    await page.goto("/ru/events");
    await expect(page.getByRole("heading", { level: 1, name: "Афиша" })).toBeVisible();
    for (const name of ["Популярное", "В ближайшие выходные", "Все площадки", "Бесплатно"]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }

    await page
      .getByRole("navigation", { name: "Жанры" })
      .getByRole("link", { name: "Театр" })
      .click();
    await expect(page).toHaveURL(/genre=theatre/);
    await expect(page.getByRole("link", { name: "Театр" })).toHaveAttribute("aria-current", "page");
    const titles = page.getByRole("article").getByRole("heading", { level: 3 });
    await expect(titles.first()).toBeVisible();

    await titles.first().getByRole("link").click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "О мероприятии" })).toBeVisible();
    await expect(page.getByText("Возрастное ограничение")).toBeVisible();
  });

  test("an event goes to the calendar, and tickets say they are a demo", async ({ page }) => {
    await page.goto("/ru/events/steppe-sounds");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Добавить в календарь" }).click();
    expect((await download).suggestedFilename()).toBe("steppe-sounds.ics");
    await page.getByRole("button", { name: "Билеты" }).click();
    await expect(page.getByRole("log")).toContainText("Продажа билетов не подключена");
  });

  test("a venue shows its own events", async ({ page }) => {
    await page.goto("/ru/events");
    await page
      .getByRole("link", { name: /Музей истории Кокшетау/ })
      .first()
      .click();
    await expect(page).toHaveURL(/venue=kokshetau-museum/);
    await expect(
      page.getByRole("heading", { level: 2, name: "Мероприятия площадки: Музей истории Кокшетау" }),
    ).toBeVisible();
  });

  test("an unknown event is a missing page", async ({ page }) => {
    await page.goto("/ru/events/nothing-here");
    await expect(page.getByText("404")).toBeVisible();
  });
});
