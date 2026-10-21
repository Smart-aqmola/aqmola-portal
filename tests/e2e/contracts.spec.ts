import { expect, test, type Page } from "@playwright/test";

/** Registers a resident, adds an object in Kokshetau and confirms it through the demo state service. */
async function residentWithObject(page: Page) {
  await page.goto("/ru/sign-up");
  await page.getByLabel(/Фамилия/).fill("Иванов");
  await page.getByLabel(/^Имя/).fill("Иван");
  await page.getByLabel(/^ИИН/).fill("900101300123");
  await page.getByLabel(/Номер мобильного телефона/).fill("8 701 123 45 67");
  await page.getByRole("checkbox", { name: /персональных данных/ }).check();
  await page.getByRole("button", { name: "Получить код" }).click();
  await page.getByLabel(/Код из SMS/).fill("123456");
  await page.getByRole("button", { name: "Подтвердить и создать кабинет" }).click();
  await expect(page).toHaveURL(/\/ru\/properties$/);

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

const pdf = (name: string) => ({
  name,
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4 test"),
});

/** From "Заявление" to the page of the sent application. */
async function fillAndSend(page: Page) {
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByLabel(/Документ, удостоверяющий личность/).setInputFiles(pdf("id.pdf"));
  await page.getByLabel(/Документ на объект/).setInputFiles(pdf("deed.pdf"));
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("checkbox", { name: /персональных данных/ }).check();
  await page.getByRole("checkbox", { name: /С условиями договора/ }).check();
  await page.getByRole("button", { name: "Подписать заявление (демо ЭЦП)" }).click();
  await page.getByRole("button", { name: "Отправить поставщику" }).click();
}

test.describe("contract from the application to the signed contract", () => {
  test("a resident makes a contract by the steps of the specification", async ({ page }) => {
    await residentWithObject(page);

    // The order button of a contract service leads to the wizard.
    await page.goto("/ru/services/heat-contract");
    await page.getByRole("link", { name: "Заказать услугу" }).first().click();
    await expect(page).toHaveURL(/\/ru\/contracts\/new\?service=heat-contract$/);
    await expect(page.getByLabel(/^Коммунальная услуга/)).toHaveValue("heat");
    await expect(page.getByLabel(/^Поставщик/)).toHaveValue("akmola-heat");
    await page.getByRole("button", { name: "Продолжить" }).click();

    // Application: filled from the profile, only the missing data to add.
    await expect(page).toHaveURL(/\/ru\/contracts\/[a-z0-9-]{36}$/);
    await expect(page.getByLabel(/^Фамилия/)).toHaveValue("Иванов");
    await expect(page.getByLabel(/^ИИН/)).toHaveValue("900101300123");

    // The draft survives a reload (spec 18.4).
    await page.getByLabel(/^Сведения о предыдущем договоре/).fill("договор прежнего владельца 12");
    await page.reload();
    await expect(page.getByLabel(/^Сведения о предыдущем договоре/)).toHaveValue(
      "договор прежнего владельца 12",
    );

    // Documents: not going on without them.
    await page.getByRole("button", { name: "Далее" }).click();
    await page.getByRole("button", { name: "Далее" }).click();
    await expect(page.getByText("Приложите: Документ, удостоверяющий личность")).toBeVisible();
    await page.getByLabel(/Документ, удостоверяющий личность/).setInputFiles({
      name: "virus.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("x"),
    });
    await expect(page.getByText(/virus.exe: допустимы только PDF/)).toBeVisible();
    await page.getByRole("button", { name: "Убрать файл: virus.exe" }).click();
    await page.getByLabel(/Документ, удостоверяющий личность/).setInputFiles(pdf("id.pdf"));
    await page.getByLabel(/Документ на объект/).setInputFiles(pdf("deed.pdf"));
    await page.getByRole("button", { name: "Далее" }).click();

    // Review, then signing: the contract text is readable and can be downloaded.
    await expect(page.getByRole("heading", { name: "Проверьте заявление" })).toBeVisible();
    await expect(page.getByText("900101••••23")).toBeVisible();
    await page.getByRole("button", { name: "Далее" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Скачать текст договора" }).click();
    expect((await download).suggestedFilename()).toBe("dogovor.txt");

    await page.getByRole("checkbox", { name: /персональных данных/ }).check();
    await page.getByRole("checkbox", { name: /С условиями договора/ }).check();
    await page.getByRole("button", { name: "Подписать заявление (демо ЭЦП)" }).click();
    await page.getByRole("button", { name: "Отправить поставщику" }).click();

    // Registered with a number, and explicitly not yet a contract (spec 4.10, 4.21).
    await expect(page.getByText(/DEMO-DOG-\d{4}-00001/).first()).toBeVisible();
    await expect(page.getByText(/Это ещё не договор/)).toBeVisible();
    await expect(page.getByText("Договор заключён.")).toHaveCount(0);
    const receipt = page.waitForEvent("download");
    await page.getByRole("button", { name: "Скачать подтверждение подачи" }).click();
    expect((await receipt).suggestedFilename()).toBe("podtverzhdenie.txt");

    // The provider approves; the applicant signs; the provider signs; only then it is a contract.
    await page.getByRole("button", { name: "Принять в работу" }).click();
    await page.getByRole("button", { name: "Согласовать и направить договор на подпись" }).click();
    await expect(page.getByText("Договор заключён.")).toHaveCount(0);
    await page.getByRole("button", { name: "Подписать договор (демо ЭЦП)" }).click();
    await page.getByRole("button", { name: "Подписать договор за поставщика" }).click();
    await expect(page.getByText(/Договор заключён\./).first()).toBeVisible();
    await expect(page.getByText(/Подписал: Иванов Иван/)).toBeVisible();
  });

  test("a returned application is corrected and sent again under the same number", async ({
    page,
  }) => {
    await residentWithObject(page);
    await page.goto("/ru/contracts/new?service=water-contract-resident");
    await page.getByRole("button", { name: "Продолжить" }).click();
    await fillAndSend(page);
    const number = (
      await page
        .locator("dd")
        .filter({ hasText: /^DEMO-DOG-/ })
        .innerText()
    ).trim();

    await page.getByRole("button", { name: "Принять в работу" }).click();
    await page.getByRole("button", { name: "Вернуть на доработку" }).click();
    await expect(page.getByRole("heading", { name: "Замечания поставщика" })).toBeVisible();
    await page.getByRole("button", { name: "Исправить и отправить повторно" }).click();

    // Nothing has to be filled in again: the data is there. The correction changes the text,
    // so the old signature no longer covers it and the application is signed anew.
    await expect(page.getByLabel(/^ИИН/)).toHaveValue("900101300123");
    await page.getByLabel(/^Сведения о предыдущем договоре/).fill("договор 12");
    await page.getByRole("button", { name: "Далее" }).click();
    await page.getByRole("button", { name: "Далее" }).click();
    await page.getByRole("button", { name: "Далее" }).click();
    await page.getByRole("button", { name: "Подписать заявление (демо ЭЦП)" }).click();
    await page.getByRole("button", { name: "Отправить поставщику" }).click();
    await expect(page.getByText(number).first()).toBeVisible();
    await expect(page.getByText("Заявление зарегистрировано").first()).toBeVisible();
  });

  test("a village without gas cannot start a gas contract", async ({ page }) => {
    await page.goto("/ru/sign-in");
    await page.getByRole("button", { name: "Войти как житель" }).click();
    await page.goto("/ru/properties/new");
    const search = page.getByRole("combobox", { name: "Поиск адреса" });
    await search.fill("мариновка");
    await search.press("ArrowDown");
    await search.press("Enter");
    await page.getByLabel(/^Дом/).fill("3");
    await page.getByLabel(/^Тип объекта/).selectOption("house");
    await page.getByLabel(/^Ваша роль/).selectOption("owner");
    await page.getByRole("button", { name: "Сохранить объект" }).click();
    await page.getByRole("button", { name: "Подтвердить через госсервис" }).click();
    await expect(page.getByRole("heading", { name: "Объект подтверждён" })).toBeVisible();

    await page.goto("/ru/contracts/new");
    const gas = page.getByLabel(/^Коммунальная услуга/).locator('option[value="gas"]');
    await expect(gas).toBeDisabled();
    await expect(gas).toContainText("недоступно по этому адресу");
  });

  test("a guest is sent to sign in and comes back to the wizard", async ({ page }) => {
    await page.goto("/ru/contracts/new");
    await page.getByRole("main").getByRole("link", { name: "Войти" }).click();
    await expect(page).toHaveURL(/sign-in\?next=%2Fru%2Fcontracts%2Fnew/);
  });

  test("every step of the wizard fits the screen without scrolling sideways", async ({ page }) => {
    await residentWithObject(page);
    await page.goto("/ru/contracts/new?service=gas-contract");
    await page.getByRole("button", { name: "Продолжить" }).click();

    const overflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
    const next = () => page.getByRole("button", { name: "Далее" }).click();

    expect(await overflow(), "application").toBeLessThanOrEqual(0);
    await next();
    expect(await overflow(), "documents").toBeLessThanOrEqual(0);
    await page.getByLabel(/Документ, удостоверяющий личность/).setInputFiles(pdf("id.pdf"));
    await page.getByLabel(/Документ на объект/).setInputFiles(pdf("deed.pdf"));
    await next();
    expect(await overflow(), "review").toBeLessThanOrEqual(0);
    await next();
    expect(await overflow(), "signing").toBeLessThanOrEqual(0);
  });

  test("an unknown application id is a 404", async ({ page }) => {
    await page.goto("/ru/contracts/Bad_Id");
    await expect(page.getByText("404")).toBeVisible();
  });
});
