import { expect, test, type Page } from "@playwright/test";

async function signInAsResident(page: Page) {
  await page.goto("/ru/sign-in");
  await page.getByRole("button", { name: "Войти как житель" }).click();
  await expect(page).toHaveURL(/\/ru\/applications$/);
}

async function addApartment(page: Page) {
  await page.goto("/ru/properties/new");
  const search = page.getByRole("combobox", { name: "Поиск адреса" });
  await search.fill("абая");
  await search.press("ArrowDown");
  await search.press("Enter");

  await expect(page.getByLabel(/^Город или район/)).toHaveValue("kokshetau");
  await page.getByLabel(/^Дом/).fill("10");
  await page.getByLabel(/^Квартира/).fill("5");
  await page.getByLabel(/^Тип объекта/).selectOption("apartment");
  await page.getByLabel(/^Ваша роль/).selectOption("owner");
  await page.getByRole("button", { name: "Сохранить объект" }).click();
  await expect(page).toHaveURL(/\/ru\/properties\/[a-z0-9-]{36}$/);
}

test.describe("objects of the resident", () => {
  test("adds an object by picking an address with the keyboard and confirms it", async ({
    page,
  }) => {
    await signInAsResident(page);
    await page.goto("/ru/properties");
    await expect(page.getByRole("heading", { name: "Объектов пока нет" })).toBeVisible();

    await addApartment(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Кокшетау, улица Абая, 10, кв. 5" }),
    ).toBeVisible();
    await expect(page.getByText("Не подтверждён").first()).toBeVisible();

    // Before confirmation the providers are listed, but there is no way to order from them.
    await expect(page.getByRole("heading", { name: "Электроснабжение" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Услуги поставщика/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Подтвердить через госсервис" }).click();
    await expect(page.getByRole("heading", { name: "Объект подтверждён" })).toBeVisible();

    // Kokshetau: water, heat, gas, waste and two electricity companies.
    await expect(page.getByRole("link", { name: /Услуги поставщика/ })).toHaveCount(6);
    await page.getByRole("link", { name: /Услуги поставщика — Водоканал/ }).click();
    await expect(page).toHaveURL(/\/ru\/services\?organization=akmola-water&territory=kokshetau/);

    await page.goto("/ru/properties");
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByText("Подтверждён", { exact: true })).toBeVisible();
  });

  test("a village without gas says the contract cannot be made and offers no way to order", async ({
    page,
  }) => {
    await signInAsResident(page);
    await page.goto("/ru/properties/new");
    const search = page.getByRole("combobox", { name: "Поиск адреса" });
    await search.fill("мариновка");
    await search.press("ArrowDown");
    await search.press("Enter");
    await page.getByLabel(/^Дом/).fill("3");
    await page.getByLabel(/^Тип объекта/).selectOption("house");
    await page.getByLabel(/^Ваша роль/).selectOption("owner");
    await page.getByRole("button", { name: "Сохранить объект" }).click();
    await expect(page).toHaveURL(/\/ru\/properties\/[a-z0-9-]{36}$/);
    await page.getByRole("button", { name: "Подтвердить через госсервис" }).click();
    await expect(page.getByRole("heading", { name: "Объект подтверждён" })).toBeVisible();

    const gas = page.getByRole("listitem").filter({
      has: page.getByRole("heading", { name: "Газоснабжение" }),
    });
    await expect(gas).toContainText("Не предоставляется");
    await expect(gas).toContainText("Договор оформить нельзя.");
    await expect(gas.getByRole("link")).toHaveCount(0);

    const electricity = page.getByRole("listitem").filter({
      has: page.getByRole("heading", { name: "Электроснабжение" }),
    });
    await expect(electricity.getByRole("link").first()).toBeVisible();
  });

  test("sends documents, refuses a wrong file and waits for the employee", async ({ page }) => {
    await signInAsResident(page);
    await addApartment(page);

    await page.getByLabel(/Выбрать файлы/).setInputFiles({
      name: "virus.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("x"),
    });
    await expect(page.getByRole("alert").filter({ hasText: "virus.exe" })).toContainText(
      "допустимы только PDF",
    );
    await page.getByRole("button", { name: "Убрать virus.exe" }).click();

    await page.getByLabel(/Выбрать файлы/).setInputFiles({
      name: "deed.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 test"),
    });
    await page.getByRole("button", { name: "Отправить на проверку" }).click();
    await expect(page.getByRole("heading", { name: "Документы на проверке" })).toBeVisible();

    await page.getByRole("button", { name: "Отклонить объект" }).click();
    await expect(page.getByRole("heading", { name: "Объект отклонён" })).toBeVisible();
  });

  test("a guest is sent to sign in and comes back to the page", async ({ page }) => {
    await page.goto("/ru/properties/new");
    await page.getByRole("main").getByRole("link", { name: "Войти" }).click();
    await expect(page).toHaveURL(/sign-in\?next=%2Fru%2Fproperties%2Fnew/);
    await page.getByRole("button", { name: "Войти как житель" }).click();
    await expect(page).toHaveURL(/\/ru\/properties\/new$/);
  });

  test("a registered resident lands on the objects page", async ({ page }) => {
    await page.goto("/ru/sign-up");
    await page.getByLabel(/Фамилия/).fill("Сидоров");
    await page.getByLabel(/^Имя/).fill("Сидор");
    await page.getByLabel(/^ИИН/).fill("910202300789");
    await page.getByLabel(/Номер мобильного телефона/).fill("+7 702 555 66 77");
    await page.getByRole("checkbox", { name: /персональных данных/ }).check();
    await page.getByRole("button", { name: "Получить код" }).click();
    await page.getByLabel(/Код из SMS/).fill("123456");
    await page.getByRole("button", { name: "Подтвердить и создать кабинет" }).click();
    await expect(page).toHaveURL(/\/ru\/properties$/);
  });

  test("the pages do not scroll sideways", async ({ page }) => {
    await signInAsResident(page);
    await addApartment(page);
    for (const path of ["/ru/properties", "/ru/properties/new", page.url()]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test("an unknown object id is a 404", async ({ page }) => {
    await page.goto("/ru/properties/Bad_Id");
    await expect(page.getByText("404")).toBeVisible();
  });
});
