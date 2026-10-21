import { expect, test } from "@playwright/test";

const pages = [
  "/ru",
  "/kk",
  "/en",
  "/ru/services",
  "/ru/services/gas-contract",
  "/ru/services/gas-contract/apply",
  "/ru/applications",
  "/ru/operator",
  "/ru/sign-in",
  "/ru/sign-up",
  "/ru/properties",
  "/ru/properties/new",
  "/ru/news",
  "/ru/news/heating-season-started",
  "/ru/tourism",
  "/ru/tourism/burabay",
  "/ru/about",
  "/en/services",
];

test.describe("structure every page must have", () => {
  for (const path of pages) {
    test(`${path}: one h1, a main landmark, named images, labelled fields, no empty buttons`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

      const problems = await page.evaluate(() => {
        const found: string[] = [];
        for (const img of document.querySelectorAll("img")) {
          if (!img.hasAttribute("alt")) found.push(`img without alt: ${img.src}`);
        }
        for (const field of document.querySelectorAll(
          "input:not([type=hidden]), select, textarea",
        )) {
          const element = field as HTMLInputElement;
          const named =
            element.labels?.length ||
            element.getAttribute("aria-label") ||
            element.getAttribute("aria-labelledby");
          if (!named) found.push(`unlabelled field: ${element.name || element.type}`);
        }
        for (const button of document.querySelectorAll("button, a[href]")) {
          const text = (button.textContent ?? "").trim() || button.getAttribute("aria-label");
          const hasImage = button.querySelector("img[alt]:not([alt=''])");
          if (!text && !hasImage) found.push(`empty control: ${button.outerHTML.slice(0, 80)}`);
        }
        return found;
      });
      expect(problems).toEqual([]);
    });
  }

  test("headings never skip a level on the main pages", async ({ page }) => {
    for (const path of ["/ru", "/ru/services", "/ru/news", "/ru/tourism/burabay"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const levels = await page.evaluate(() =>
        [...document.querySelectorAll("h1, h2, h3, h4")].map((h) => Number(h.tagName[1])),
      );
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i] - levels[i - 1], `${path}: ${levels.join(",")}`).toBeLessThanOrEqual(1);
      }
    }
  });
});

test.describe("display settings", () => {
  test("dark theme is applied, saved and shown before the page is painted", async ({ page }) => {
    await page.goto("/ru");
    await page.getByRole("button", { name: "Настройки вида" }).click();
    await page.getByRole("radio", { name: "Тёмная" }).check();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).toBe("rgb(13, 26, 32)");

    await page.reload({ waitUntil: "commit" });
    // The inline script has already set the attribute at this point.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("a dark system preference is followed when nothing is chosen", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3100/ru/services");
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).toBe("rgb(13, 26, 32)");
    await context.close();
  });

  test("large text makes the text bigger and high contrast darkens the text", async ({ page }) => {
    await page.goto("/ru/services");
    const size = () =>
      page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize));
    const before = await size();
    await page.getByRole("button", { name: "Настройки вида" }).click();
    await page.getByRole("checkbox", { name: "Крупный шрифт" }).check();
    expect(await size()).toBeGreaterThan(before);

    await page.getByRole("checkbox", { name: "Высокий контраст" }).check();
    const color = await page.evaluate(() => getComputedStyle(document.body).color);
    expect(color).toBe("rgb(0, 0, 0)");
  });

  test("the panel works from the keyboard and closes on Escape", async ({ page }) => {
    await page.goto("/ru/services");
    const button = page.getByRole("button", { name: "Настройки вида" });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("group", { name: "Вид сайта" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("group", { name: "Вид сайта" })).toHaveCount(0);
    await expect(button).toBeFocused();
  });

  test("large text and the dark theme do not break the phone layout", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/ru/services");
    await page.getByRole("button", { name: "Настройки вида" }).click();
    await page.getByRole("checkbox", { name: "Крупный шрифт" }).check();
    await page.getByRole("radio", { name: "Тёмная" }).check();
    for (const path of ["/ru/services", "/ru/news", "/ru"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test("large text keeps the language links apart from each other", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/ru/services");
    await page.getByRole("button", { name: "Настройки вида" }).click();
    await page.getByRole("checkbox", { name: "Крупный шрифт" }).check();
    await page.goto("/ru");
    const links = page.getByRole("group", { name: "Язык" }).getByRole("link");
    const boxes = await links.evaluateAll((elements) =>
      elements.map((element) => {
        // The text itself, not the tap area around it.
        const range = document.createRange();
        range.selectNodeContents(element);
        const { left, right } = range.getBoundingClientRect();
        return { left, right };
      }),
    );
    for (let index = 1; index < boxes.length; index += 1) {
      expect(
        boxes[index].left - boxes[index - 1].right,
        `gap before link ${index}`,
      ).toBeGreaterThanOrEqual(4);
    }
  });

  test("large text keeps every header control inside a phone screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/ru/services");
    await page.getByRole("button", { name: "Настройки вида" }).click();
    await page.getByRole("checkbox", { name: "Крупный шрифт" }).check();
    await page.goto("/ru");
    const controls = page.locator("header").getByRole("link").or(page.locator("header button"));
    for (const control of await controls.all()) {
      const box = await control.boundingBox();
      if (!box) continue; // hidden, for example the collapsed menu links
      const name = (await control.getAttribute("aria-label")) ?? (await control.innerText());
      expect(box.x + box.width, name).toBeLessThanOrEqual(375);
    }
  });
});

test("large text keeps the header inside a laptop screen", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/ru");
  await page.getByRole("button", { name: "Настройки вида" }).click();
  await page.getByRole("checkbox", { name: "Крупный шрифт" }).check();
  const controls = page.locator("header").getByRole("link").or(page.locator("header button"));
  for (const control of await controls.all()) {
    const box = await control.boundingBox();
    if (!box) continue;
    const name = (await control.getAttribute("aria-label")) ?? (await control.innerText());
    expect(box.x + box.width, name).toBeLessThanOrEqual(1280);
  }
});
