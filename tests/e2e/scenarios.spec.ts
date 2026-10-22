import { expect, test, type Page } from "@playwright/test";

/**
 * The five end-to-end scenarios of the specification (21.2). Each one goes through the whole chain:
 * the resident does a part, the organization (here: its cabinet) does its part, and the resident
 * sees the result. The cases with their expected results are in docs/test-cases.md (21.3).
 */

const PHONE = "8 701 123 45 67";

async function register(page: Page) {
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
async function addConfirmedObject(page: Page) {
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

async function signInAsOperator(page: Page, organizationId: string) {
  await page.goto("/ru/sign-in");
  const out = page.getByRole("button", { name: "Выйти" });
  if (await out.isVisible()) await out.click();
  await page.getByLabel("Организация").selectOption(organizationId);
  await page.getByRole("button", { name: "Войти как оператор" }).click();
  await expect(page).toHaveURL(/\/ru\/operator$/);
}

async function signInAsResident(page: Page) {
  await page.goto("/ru/sign-in");
  await page.getByRole("button", { name: "Выйти" }).click();
  await page.getByLabel(/Номер мобильного телефона/).fill(PHONE);
  await page.getByRole("button", { name: "Получить код" }).click();
  await page.getByLabel(/Код из SMS/).fill("123456");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).not.toHaveURL(/sign-in/);
}

/** One card of a register of the cabinet: choose the action and apply it. */
async function operatorDoes(card: ReturnType<Page["getByRole"]>, action: string) {
  await card.getByLabel(/^Действие/).selectOption(action);
  await card.getByRole("button", { name: "Применить" }).click();
}

const pdf = (name: string) => ({
  name,
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4 test"),
});

/** Adds a cold-water meter with the first reading 120 (spec 6.5). */
async function addWaterMeter(page: Page) {
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

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

test.describe("end-to-end scenarios of the specification (21.2)", () => {
  test("Scenario 1. Concluding a contract", async ({ page }) => {
    await test.step("the user registers, adds an object and confirms the right to it", async () => {
      await register(page);
      await addConfirmedObject(page);
    });

    await test.step("chooses the provider, fills in the application, attaches documents, signs and sends", async () => {
      await page.goto("/ru/contracts/new?service=water-contract-resident");
      await expect(page.getByLabel(/^Поставщик/)).toHaveValue("akmola-water");
      await page.getByRole("button", { name: "Продолжить" }).click();
      await page.getByRole("button", { name: "Далее" }).click();
      await page.getByLabel(/Документ, удостоверяющий личность/).setInputFiles(pdf("id.pdf"));
      await page.getByLabel(/Документ на объект/).setInputFiles(pdf("deed.pdf"));
      await page.getByRole("button", { name: "Далее" }).click();
      await page.getByRole("button", { name: "Далее" }).click();
      await page.getByRole("checkbox", { name: /персональных данных/ }).check();
      await page.getByRole("checkbox", { name: /С условиями договора/ }).check();
      await page.getByRole("button", { name: "Подписать заявление (демо ЭЦП)" }).click();
      await page.getByRole("button", { name: "Отправить поставщику" }).click();
      await expect(page.getByText(/DEMO-DOG-\d{4}-00001/).first()).toBeVisible();
    });

    await test.step("the provider reviews it and sends the contract for signing", async () => {
      await signInAsOperator(page, "akmola-water");
      await page.goto("/ru/operator/contracts");
      const card = page.getByRole("article");
      await expect(card).toHaveCount(1);
      await operatorDoes(card, "under_review");
      await operatorDoes(card, "awaiting_applicant_signature");
    });

    await test.step("the user tracks the status and signs the contract", async () => {
      await signInAsResident(page);
      await page.goto("/ru/contracts");
      await expect(page.getByRole("article")).toContainText("Ожидает подписания заявителем");
      await page.getByRole("link", { name: /Открыть/ }).click();
      await page.getByRole("button", { name: "Подписать договор (демо ЭЦП)" }).click();
    });

    await test.step("the provider records its signature and the contract is concluded", async () => {
      await signInAsOperator(page, "akmola-water");
      await page.goto("/ru/operator/contracts");
      await operatorDoes(page.getByRole("article"), "concluded");
    });

    await test.step("the user sees the concluded contract and downloads it from the cabinet", async () => {
      await signInAsResident(page);
      await page.goto("/ru/contracts");
      await expect(page.getByRole("article")).toContainText("Договор заключён");
      await page.getByRole("link", { name: /Открыть/ }).click();
      const download = page.waitForEvent("download");
      await page
        .getByRole("listitem")
        .filter({ hasText: /^Договор/ })
        .getByRole("button")
        .click();
      expect((await download).suggestedFilename()).toBe("dogovor.txt");
    });
  });

  test("Scenario 2. Sending meter readings", async ({ page }) => {
    await register(page);
    await addConfirmedObject(page);
    await addWaterMeter(page);

    await test.step("the user opens the meter, enters the reading, attaches a photo and sends it", async () => {
      await page
        .getByRole("link", { name: /Передать показания/ })
        .last()
        .click();
      await page.getByLabel(/^Текущие показания/).fill("130");
      await page.locator('input[aria-label="Выбрать из галереи"]').setInputFiles({
        name: "meter.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("jpg"),
      });
      await page.getByRole("checkbox", { name: /достоверны/ }).check();
      await page.getByRole("button", { name: "Отправить показания" }).click();
      await expect(page.getByText(/Номер: DEMO-POK-\d{4}-00001/)).toBeVisible();
    });

    await test.step("the provider accepts it and passes it into its system", async () => {
      await signInAsOperator(page, "akmola-water");
      await page.goto("/ru/operator/readings");
      const card = page.getByRole("article");
      await expect(card).toHaveCount(1);
      await card.getByText("Демо: решение поставщика").click();
      for (const action of ["accepted", "passed_to_system", "processed"]) {
        await operatorDoes(card, action);
      }
    });

    await test.step("the user sees the result of the check and that the provider has the reading", async () => {
      await signInAsResident(page);
      await page.goto("/ru/meters/history");
      await expect(page.getByText("Учтено при начислении")).toBeVisible();
      await expect(page.getByText("Обработано поставщиком").first()).toBeVisible();
      await page.goto("/ru/notifications");
      await expect(
        page.getByText(/Статус показаний DEMO-POK-\d{4}-00001: Обработано поставщиком/),
      ).toBeVisible();
    });
  });

  test("Scenario 3. Sealing a meter", async ({ page }) => {
    await register(page);
    await addConfirmedObject(page);
    await addWaterMeter(page);

    await test.step("the user chooses the meter, fills in the request, attaches documents and gets a number", async () => {
      await page.goto("/ru/meters/order/sealing");
      await page.getByLabel(/^Коммунальная услуга/).selectOption("cold_water");
      await page.getByLabel(/^Прибор учёта/).selectOption({ label: "Холодная вода, № SN-77" });
      await page.getByLabel(/^Причина/).selectOption("new_meter");
      await page.getByLabel(/^Дата 1/).fill(tomorrow());
      await page.getByLabel(/^Контактный телефон/).fill("+7 701 123 45 67");
      await page
        .locator('input[aria-label="Фотографии и документы"]')
        .setInputFiles(pdf("act-of-installation.pdf"));
      await page.getByRole("button", { name: "Отправить заявку" }).click();
      await expect(page.getByText(/Номер заявки: DEMO-ZPR-\d{4}-00001/)).toBeVisible();
    });

    await test.step("the provider takes it, appoints a specialist and a day, does the work and records the seal", async () => {
      await signInAsOperator(page, "akmola-water");
      await page.goto("/ru/operator/meters");
      const card = page.getByRole("article");
      await expect(card).toHaveCount(1);
      await operatorDoes(card, "in_progress");
      await operatorDoes(card, "scheduled");
      await operatorDoes(card, "done");
    });

    await test.step("the user is notified, downloads the act and sees the new seal on the meter", async () => {
      await signInAsResident(page);
      await page.goto("/ru/notifications");
      await expect(page.getByText(/назначено время/)).toBeVisible();
      await expect(page.getByText(/выполнена и закрыта/)).toBeVisible();

      await page.goto("/ru/meters/requests");
      await page.getByRole("link", { name: /Открыть/ }).click();
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Скачать акт" }).click();
      expect((await download).suggestedFilename()).toMatch(/^DEMO-ZPR-\d{4}-00001\.txt$/);

      await page.goto("/ru/meters");
      await expect(page.getByRole("article", { name: "Холодная вода, № SN-77" })).toContainText(
        /P-\d{5}/,
      );
    });
  });

  test("Scenario 4. The single receipt and the payment", async ({ page }) => {
    await register(page);
    await addConfirmedObject(page);

    await test.step("the portal shows the charges by service and matches them with the object and the accounts", async () => {
      await page.goto("/ru/billing");
      const table = page.getByRole("table");
      await expect(table).toBeVisible();
      await expect(page.getByText("Всего к оплате")).toBeVisible();
      await page.getByLabel("Как показать").selectOption("providers");
      await expect(page.getByRole("article").first()).toContainText("Лицевой счёт");
    });

    await test.step("it forms the single receipt with the debt of each service, and lets it be downloaded", async () => {
      await page.goto("/ru/billing/receipt");
      await expect(page.getByRole("article")).toContainText("Общая сумма к оплате");
      await expect(page.getByRole("article")).toContainText("Задолженность");
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Скачать квитанцию (демо)" }).click();
      expect((await download).suggestedFilename()).toMatch(/^receipt-\d{4}-\d{2}\.txt$/);
    });

    await test.step("the user starts the payment, gets the confirmation and sees the result for each service", async () => {
      await page.goto("/ru/billing/pay");
      await page.getByRole("button", { name: "Перейти к оплате" }).click();
      await expect(page).toHaveURL(/\/ru\/billing\/payments\/[a-z0-9-]{36}$/);
      await page.getByRole("button", { name: "Перейти в платёжный сервис" }).click();
      for (const result of ["processing", "paid"]) {
        await page.getByLabel(/^Результат платежа/).selectOption(result);
        await page.getByRole("button", { name: "Сообщить порталу" }).click();
      }
      await expect(page.getByText("Успешно оплачен").first()).toBeVisible();
      await expect(page.getByRole("table")).toContainText("Лицевой счёт");
      const confirmation = page.waitForEvent("download");
      await page.getByRole("button", { name: "Скачать подтверждение оплаты (демо)" }).click();
      expect((await confirmation).suggestedFilename()).toMatch(/^DEMO-PAY-\d{4}-00001\.txt$/);
    });

    await test.step("what was paid is no longer to pay, and the provider sees its share", async () => {
      await page.goto("/ru/billing/pay");
      await expect(page.getByRole("checkbox")).toHaveCount(0);
      await signInAsOperator(page, "akmola-water");
      await page.goto("/ru/operator/payments");
      await expect(page.getByText(/Получено по оплаченным платежам/)).toBeVisible();
    });
  });

  test("Scenario 5. Handling an appeal", async ({ page }) => {
    await register(page);
    await addConfirmedObject(page);

    await test.step("the user sends a complaint; it is registered, goes to the responsible organization and the executor", async () => {
      await page.goto("/ru/appeals/new");
      await page.getByLabel(/^Категория/).selectOption("water_cut");
      await page.getByLabel(/^Объект/).selectOption({ index: 1 });
      await page.getByLabel(/^Что случилось/).fill("Воды нет с утра, соседи тоже без воды");
      await page.getByLabel(/^Контактный телефон/).fill("+7 701 123 45 67");
      await page.getByRole("button", { name: "Отправить обращение" }).click();
      await expect(page.getByText(/Номер обращения: DEMO-OBR-\d{4}-00001/)).toBeVisible();
      await page.getByRole("link", { name: "Открыть обращение" }).click();
      await expect(page.getByText("Направлено исполнителю").first()).toBeVisible();
    });

    await test.step("the executor takes it into work and writes the answer", async () => {
      await signInAsOperator(page, "akmola-water");
      await page.goto("/ru/operator/appeals");
      const card = page.getByRole("article");
      await expect(card).toHaveCount(1);
      await card.getByText("Демо: решение организации").click();
      await operatorDoes(card, "accepted");
      await operatorDoes(card, "in_review");
      await card.getByLabel(/^Действие/).selectOption("answer_ready");
      await card
        .getByLabel(/^Текст для заявителя/)
        .fill("Авария устранена, вода подаётся в обычном режиме.");
      await card.getByRole("button", { name: "Применить" }).click();
    });

    await test.step("the user sees the status and the saved answer, and is notified about the result", async () => {
      await signInAsResident(page);
      await page.goto("/ru/appeals");
      await expect(page.getByRole("article")).toContainText("Подготовлен ответ");
      await expect(page.getByRole("article")).toContainText("Авария устранена");
      await page.goto("/ru/notifications");
      await expect(
        page.getByText(/Ответ на обращение DEMO-OBR-\d{4}-00001: Авария устранена/),
      ).toBeVisible();
      await page.goto("/ru/applications");
      await expect(page.getByRole("article")).toContainText("Подготовлен ответ");
    });
  });
});
