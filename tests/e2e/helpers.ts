import { expect, type Page } from "@playwright/test";

/** Steps shared by the end-to-end tests. */

export const PHONE = "8 701 123 45 67";

export async function register(page: Page) {
  await page.goto("/ru/sign-up");
  await page.getByLabel(/Фамилия/).fill("Иванов");
  await page.getByLabel(/^Имя/).fill("Иван");
  await page.getByLabel(/^ИИН/).fill("900101300123");
  await page.getByLabel(/Номер мобильного телефона/).fill(PHONE);
  await page.getByRole("checkbox", { name: /персональных данных/ }).check();
  await page.getByRole("button", { name: "Получить код" }).click();
  await page.getByLabel(/Код из SMS/).fill("123456");
  await page.getByRole("button", { name: "Подтвердить и создать кабинет" }).click();
  await expect(page).toHaveURL(/\/ru\/properties$/);
}

/** An object in Kokshetau, confirmed through the state service (spec 3.5, 3.6). */
export async function addConfirmedObject(page: Page) {
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

export async function signInAsOperator(page: Page, organizationId: string) {
  await page.goto("/ru/sign-in");
  const out = page.getByRole("button", { name: "Выйти" });
  if (await out.isVisible()) await out.click();
  await page.getByLabel("Организация").selectOption(organizationId);
  await page.getByRole("button", { name: "Войти как оператор" }).click();
  await expect(page).toHaveURL(/\/ru\/operator$/);
}

export async function signInAsResident(page: Page) {
  await page.goto("/ru/sign-in");
  await page.getByRole("button", { name: "Выйти" }).click();
  await page.getByLabel(/Номер мобильного телефона/).fill(PHONE);
  await page.getByRole("button", { name: "Получить код" }).click();
  await page.getByLabel(/Код из SMS/).fill("123456");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).not.toHaveURL(/sign-in/);
}

/** One card of a register of the cabinet: choose the action and apply it. */
export async function operatorDoes(card: ReturnType<Page["getByRole"]>, action: string) {
  await card.getByLabel(/^Действие/).selectOption(action);
  await card.getByRole("button", { name: "Применить" }).click();
}

export const pdf = (name: string) => ({
  name,
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4 test"),
});

/** Adds a cold-water meter with the first reading 120 (spec 6.5). */
export async function addWaterMeter(page: Page) {
  await page.goto("/ru/meters");
  await page.getByRole("button", { name: "Добавить прибор" }).click();
  await page.getByLabel(/^Вид ресурса/).selectOption("cold_water");
  await page.getByLabel(/^Тип прибора/).selectOption("mechanical");
  await page.getByLabel(/^Заводской номер/).fill("SN-77");
  await page.getByLabel(/^Дата установки/).fill("2024-05-01");
  await page.getByLabel(/^Показания на сегодня/).fill("120");
  await page.getByRole("button", { name: "Добавить прибор" }).click();
  await expect(page.getByRole("article", { name: "Холодная вода, № SN-77" })).toBeVisible();
}

export const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

/**
 * What every page must have for keyboard and screen reader users: one h1, labelled fields, named
 * images and controls, unique ids, no references to missing elements, no tab order games and no
 * skipped heading levels. Returns the problems found.
 */
export function pageProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = [];
    const h1 = document.querySelectorAll("h1").length;
    if (h1 !== 1) found.push(`h1 count: ${h1}`);
    if (document.querySelectorAll("main").length !== 1) found.push("main landmark count");
    for (const img of document.querySelectorAll("img")) {
      if (!img.hasAttribute("alt")) found.push(`img without alt: ${img.src}`);
    }
    for (const field of document.querySelectorAll("input:not([type=hidden]), select, textarea")) {
      const element = field as HTMLInputElement;
      const named =
        element.labels?.length ||
        element.getAttribute("aria-label") ||
        element.getAttribute("aria-labelledby");
      if (!named) found.push(`unlabelled field: ${element.name || element.type}`);
    }
    for (const control of document.querySelectorAll("button, a[href]")) {
      const text = (control.textContent ?? "").trim() || control.getAttribute("aria-label");
      const hasImage = control.querySelector("img[alt]:not([alt=''])");
      if (!text && !hasImage) found.push(`empty control: ${control.outerHTML.slice(0, 80)}`);
    }
    const ids = new Map<string, number>();
    for (const element of document.querySelectorAll("[id]")) {
      ids.set(element.id, (ids.get(element.id) ?? 0) + 1);
    }
    for (const [id, count] of ids) if (count > 1) found.push(`duplicate id: ${id}`);
    for (const attr of ["aria-describedby", "aria-labelledby", "aria-controls"]) {
      for (const element of document.querySelectorAll(`[${attr}]`)) {
        for (const ref of (element.getAttribute(attr) ?? "").split(/\s+/).filter(Boolean)) {
          if (!document.getElementById(ref)) found.push(`${attr} points to missing #${ref}`);
        }
      }
    }
    for (const element of document.querySelectorAll("[tabindex]")) {
      if (Number(element.getAttribute("tabindex")) > 0) found.push("positive tabindex");
    }
    const levels = [...document.querySelectorAll("main h1, main h2, main h3, main h4")].map(
      (heading) => Number(heading.tagName[1]),
    );
    for (let index = 1; index < levels.length; index += 1) {
      if (levels[index] - levels[index - 1] > 1) {
        found.push(`heading level skipped: ${levels.join(",")}`);
        break;
      }
    }
    return found;
  });
}
