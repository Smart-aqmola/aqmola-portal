import { expect, test } from "@playwright/test";

test.describe("language routing", () => {
  test("an unsupported browser language falls back to Russian", async ({ browser }) => {
    const context = await browser.newContext({ locale: "fr-FR" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/ru$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await context.close();
  });

  test("a Kazakh browser is sent to /kk", async ({ browser }) => {
    const context = await browser.newContext({ locale: "kk-KZ" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/kk$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "kk");
    await context.close();
  });
});

test.describe("page frame", () => {
  test("shows the test banner and the footer disclaimer", async ({ page }) => {
    await page.goto("/ru");
    await expect(page.getByRole("note")).toContainText("Тестовая версия");
    await expect(page.getByRole("contentinfo")).toContainText(
      "Не является государственным сервисом",
    );
  });

  for (const lang of ["ru", "kk", "en"]) {
    test(`keeps every header control inside a 375px screen in ${lang}`, async ({ page }) => {
      // 375px is the narrowest phone we support.
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`/${lang}`);
      const viewport = page.viewportSize()!;
      const controls = page.locator("header").getByRole("link").or(page.locator("header button"));
      for (const control of await controls.all()) {
        const box = await control.boundingBox();
        if (!box) continue; // hidden, for example the collapsed menu links
        const name = (await control.getAttribute("aria-label")) ?? (await control.innerText());
        expect(box.x, name).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, name).toBeLessThanOrEqual(viewport.width);
      }
    });
  }

  test("switches the language and keeps the page", async ({ page }) => {
    await page.goto("/ru/design");
    await page.getByRole("link", { name: "ҚАЗ" }).click();
    await expect(page).toHaveURL(/\/kk\/design$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "kk");
    // On phones the menu is collapsed, so look at the link even when it is hidden.
    await expect(
      page.getByRole("link", { name: "Басты бет", includeHidden: true }),
    ).toHaveAttribute("href", "/kk");
  });

  test("skip link moves focus to the main content", async ({ page }) => {
    await page.goto("/ru");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Перейти к содержимому" })).toBeFocused();
  });
});

test.describe("home page", () => {
  test("shows the heading, the search and the life situations", async ({ page }) => {
    await page.goto("/ru");
    await expect(
      page.getByRole("heading", { level: 1, name: "Вся область ждёт вас." }),
    ).toBeVisible();
    await expect(page.getByRole("search", { name: "Поиск услуги" })).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(8);
    await expect(page.getByRole("tab", { selected: true })).toContainText("Приборы учёта");
  });

  test("has no horizontal scroll", async ({ page }) => {
    await page.goto("/ru");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("switches popular services when another life situation is chosen", async ({ page }) => {
    await page.goto("/ru");
    const panel = page.getByRole("tabpanel");
    await expect(
      panel.getByRole("heading", { level: 3, name: /Передача показаний/ }).first(),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Подключение и технические условия" }).click();

    await expect(
      panel.getByRole("heading", { name: /Популярные услуги: Подключение/ }),
    ).toBeVisible();
    await expect(panel.getByRole("article")).toHaveCount(3);
    await expect(panel.getByRole("link", { name: "Все услуги" })).toHaveAttribute(
      "href",
      "/ru/services?situation=connection",
    );
  });

  test("moves between life situations with the keyboard", async ({ page }) => {
    await page.goto("/ru");
    await page.getByRole("tab", { selected: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("tab", { name: "Подключение и технические условия" }),
    ).toBeFocused();
    await expect(page.getByRole("tab", { selected: true })).toContainText("Подключение");
  });

  test("sends the search to the catalog with the chosen filters", async ({ page }) => {
    await page.goto("/ru");
    await page.getByRole("radio", { name: "Бизнесу", includeHidden: true }).check({ force: true });
    await page.getByRole("searchbox", { name: "Что нужно сделать" }).fill("договор");
    await page.getByRole("combobox", { name: "Где" }).selectOption("burabay");
    await page.getByRole("button", { name: "Найти" }).click();

    await expect(page).toHaveURL(/\/ru\/services\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get("q")).toBe("договор");
    expect(url.searchParams.get("territory")).toBe("burabay");
    expect(url.searchParams.get("for")).toBe("business");
  });

  test("shows news and the authors of the photos, without a tourism block", async ({ page }) => {
    await page.goto("/ru");
    await expect(page.getByRole("heading", { name: "Куда поехать по области" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Новости области" })).toBeVisible();
    await expect(page.getByText(/Wikimedia Commons, CC BY-SA 4\.0/)).toBeVisible();
  });

  test("answers in Kazakh with translated headings", async ({ page }) => {
    await page.goto("/kk");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Бүкіл облыс сізді күтуде.");
    await expect(page.getByRole("tab", { selected: true })).toContainText("Есептеу құралдары");
  });

  test("the contact form is a demo and says nothing was sent", async ({ page }) => {
    await page.goto("/ru");
    await expect(page.getByText(/Демо-форма/)).toBeVisible();
    await page.getByRole("textbox", { name: "Ваш вопрос" }).fill("Как передать показания?");
    await page.getByRole("button", { name: "Отправить" }).click();
    await expect(page.getByRole("status")).toContainText("сообщение не было отправлено");
  });
});

test.describe("mobile menu", () => {
  test("opens and closes on small screens", async ({ page, isMobile }) => {
    test.skip(!isMobile, "only meaningful on the phone viewport");
    await page.goto("/ru");
    const nav = page.getByRole("navigation", { name: "Основная навигация" });
    await expect(nav).toBeHidden();

    await page.getByRole("button", { name: "Открыть меню" }).click();
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Услуги" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(nav).toBeHidden();
  });
});

test.describe("desktop navigation", () => {
  test("shows the links without a menu button", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop viewport only");
    await page.goto("/ru");
    await expect(page.getByRole("navigation", { name: "Основная навигация" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Открыть меню" })).toBeHidden();
  });
});
