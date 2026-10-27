import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { ProviderInfo } from "@/features/account/domain/availability";
import {
  createProperty,
  requestVerification,
  type Property,
} from "@/features/account/domain/property";
import { PROPERTIES_KEY } from "@/features/account/domain/storage";
import { DEMO_PROFILES, SESSION_KEY } from "@/features/session/domain/session";
import ru from "@/shared/i18n/dictionaries/ru.json";
import {
  createAppeal,
  emptyAppealInput,
  executorStep,
  type Appeal,
  type AppealStatus,
} from "../domain/appeal";
import { APPEALS_KEY, parseAppeals } from "../domain/storage";
import { AppealDetail } from "./appeal-detail";
import { AppealForm } from "./appeal-form";
import { AppealsList } from "./appeals-list";

const providers: ProviderInfo[] = [
  { id: "akmola-grid", name: "Электросети Акмолы", sector: "electricity", territories: "all" },
  { id: "akmola-water", name: "Водоканал Акмолы", sector: "water", territories: "all" },
];
const territories = [{ id: "atbasar", name: "Атбасарский район" }];
const base = { lang: "ru", dict: ru, territories, providers, missing: {} } as const;
const now = new Date();

function property(): Property {
  const made = createProperty(
    {
      territoryId: "atbasar",
      locality: "Мариновка",
      street: "улица Центральная",
      house: "1",
      flat: "",
      type: "house",
      relation: "owner",
      personalAccount: "",
      ownerInfo: "Демо Житель",
    },
    "p-1",
    "demo-resident",
    now,
  );
  const result = requestVerification(made, { method: "state_integration" }, now);
  if (!result.ok) throw new Error("setup failed");
  return result.property;
}

const signIn = () =>
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES.resident));
const stored = () => parseAppeals(window.localStorage.getItem(APPEALS_KEY));
const seed = (...items: Appeal[]) =>
  window.localStorage.setItem(APPEALS_KEY, JSON.stringify(items));
const choose = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const alerts = () => screen.queryAllByRole("alert").map((item) => item.textContent);
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

function appeal(...steps: [AppealStatus, string?][]): Appeal {
  let current = createAppeal(
    {
      ...emptyAppealInput("+77011234567"),
      category: "power_cut",
      subcategory: "long_outage",
      address: "Мариновка, улица Центральная, 1",
      description: "Света нет с утра, соседи тоже без света",
    },
    {
      id: "a-1",
      ownerId: "demo-resident",
      organization: { id: "akmola-grid", name: "Электросети Акмолы" },
    },
    [],
    now,
  );
  for (const [to, text] of steps) {
    const result = executorStep(current, to, text ?? "", now);
    if (!result.ok) throw new Error(`${to}: ${result.reason}`);
    current = result.appeal;
  }
  return current;
}

beforeEach(() => {
  window.localStorage.clear();
  signIn();
  window.localStorage.setItem(PROPERTIES_KEY, JSON.stringify([property()]));
});

describe("AppealForm", () => {
  const fill = () => {
    choose(/^Категория/, "power_cut");
    choose(/^Объект/, "p-1");
    choose(/^Что случилось/, "Света нет с утра, соседи тоже без света");
    choose(/^Контактный телефон/, "+7 701 123 45 67");
  };

  it("asks a guest to sign in and brings them back", () => {
    window.localStorage.removeItem(SESSION_KEY);
    render(<AppealForm {...base} />);
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute(
      "href",
      "/ru/sign-in?next=%2Fru%2Fappeals%2Fnew",
    );
  });

  it("has the thirteen subjects and picks the first subcategory itself", () => {
    render(<AppealForm {...base} />);
    const options = Array.from(screen.getByLabelText(/^Категория/).querySelectorAll("option"));
    expect(options).toHaveLength(14);
    choose(/^Категория/, "water_cut");
    expect(screen.getByLabelText(/^Подкатегория/)).toHaveValue("no_water");
  });

  it("finds the organization from the topic and the address (11.4)", () => {
    render(<AppealForm {...base} />);
    expect(
      screen.getByText("Организацию определим, когда вы выберете тему и адрес."),
    ).toBeVisible();
    choose(/^Категория/, "power_cut");
    choose(/^Объект/, "p-1");
    expect(screen.getByText("Обращение уйдёт в организацию: Электросети Акмолы")).toBeVisible();
    expect(screen.getByLabelText(/^Адрес/)).toHaveValue(
      "Атбасарский район, Мариновка, улица Центральная, 1",
    );
  });

  it("sends the appeal to the executor with a number and keeps the time of the violation (11.3, 11.5)", () => {
    render(<AppealForm {...base} />);
    fill();
    choose(/^Дата/, "2026-10-20");
    choose(/^Время/, "08:30");
    choose(/^Сколько длилось/, "5");
    click("Отправить обращение");

    expect(screen.getByRole("heading", { name: "Обращение отправлено" })).toBeVisible();
    const [made] = stored();
    expect(made).toMatchObject({
      category: "power_cut",
      subcategory: "long_outage",
      status: "sent_to_executor",
      organizationId: "akmola-grid",
      contactPhone: "+77011234567",
      sector: "electricity",
      violation: { date: "2026-10-20", time: "08:30", duration: "5", unit: "hours" },
    });
    expect(made.number).toMatch(/^DEMO-OBR-\d{4}-00001$/);
    expect(screen.getByText("Передано: Электросети Акмолы")).toBeVisible();
  });

  it("asks which utility where the topic does not say, and does not ask about the violation there", () => {
    render(<AppealForm {...base} />);
    choose(/^Категория/, "wrong_charges");
    expect(screen.queryByText("Когда было нарушение")).toBeNull();
    choose(/^Объект/, "p-1");
    choose(/^Что случилось/, "Начислили вдвое больше, чем обычно");
    choose(/^Контактный телефон/, "+7 701 123 45 67");
    click("Отправить обращение");
    expect(alerts()).toContain("Выберите услугу");
    expect(stored()).toEqual([]);

    choose(/^К какой услуге относится/, "water");
    click("Отправить обращение");
    expect(stored()[0]).toMatchObject({ sector: "water", organizationId: "akmola-water" });
  });

  it("sends what nobody owns to the region office and registers it in the electronic system (11.6)", () => {
    render(<AppealForm {...base} />);
    choose(/^Категория/, "other");
    choose(/^Адрес/, "Кокшетау, улица Абая, 5");
    choose(/^Что случилось/, "Во дворе яма, никто не чинит");
    choose(/^Контактный телефон/, "+7 701 123 45 67");
    click("Отправить обращение");
    expect(stored()[0]).toMatchObject({ organizationId: "region-office" });
    expect(stored()[0].external?.number).toMatch(/^ЭО-\d{4}-00001$/);
  });

  it("points at every missing field and stores nothing", () => {
    render(<AppealForm {...base} />);
    click("Отправить обращение");
    expect(alerts()).toEqual(
      expect.arrayContaining([
        "Выберите категорию",
        "Укажите адрес",
        "Опишите, что случилось",
        "Укажите контактный телефон",
      ]),
    );
    expect(stored()).toEqual([]);
  });

  it("checks the files like everywhere else", () => {
    render(<AppealForm {...base} />);
    fill();
    fireEvent.change(screen.getByLabelText("Приложить файлы", { selector: "input" }), {
      target: { files: [new File(["x"], "virus.exe")] },
    });
    click("Отправить обращение");
    expect(screen.getByText("Файл не подходит: нужен PDF, JPG, JPEG или PNG")).toBeVisible();
    expect(stored()).toEqual([]);
  });
});

describe("AppealsList", () => {
  it("invites to send the first appeal", () => {
    render(<AppealsList {...base} />);
    expect(screen.getByRole("heading", { name: "Обращений пока нет" })).toBeVisible();
  });

  it("shows the status, the organization and the answer, and says when it waits for a reply", () => {
    seed(appeal(["accepted"], ["in_review"], ["info_required", "Какой номер счётчика?"]));
    render(<AppealsList {...base} />);
    const card = screen.getByRole("article");
    expect(within(card).getByText("Требуется дополнительная информация")).toBeVisible();
    expect(within(card).getByText("Организация ждёт вашего ответа")).toBeVisible();
    expect(within(card).getByText("Электросети Акмолы")).toBeVisible();
    expect(within(card).getByText("Какой номер счётчика?")).toBeVisible();
  });

  it("filters by status and does not show the appeals of someone else", () => {
    seed(
      appeal(),
      { ...appeal(["accepted"]), id: "a-2", number: "DEMO-OBR-2026-00002" },
      {
        ...appeal(),
        id: "a-3",
        ownerId: "someone-else",
      },
    );
    render(<AppealsList {...base} />);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    choose(/^Статус/, "accepted");
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });
});

describe("AppealDetail", () => {
  const open = (id = "a-1") => render(<AppealDetail {...base} id={id} />);

  it("says when the appeal is not found", () => {
    open("nope");
    expect(screen.getByRole("heading", { name: "Обращение не найдено" })).toBeVisible();
  });

  it("walks through the statuses with the organization playing its part (11.7)", () => {
    seed(appeal());
    open();
    for (const [action, status] of [
      ["accepted", "Принято в работу"],
      ["in_review", "Рассматривается"],
    ] as const) {
      choose(/^Действие/, action);
      click("Применить");
      expect(stored()[0].status).toBe(action);
      expect(screen.getAllByText(status).length).toBeGreaterThan(0);
    }
  });

  it("needs words for a question and puts the appeal back to review when the person answers", () => {
    seed(appeal(["accepted"]));
    open();
    choose(/^Действие/, "info_required");
    expect(screen.getByLabelText(/^Текст для заявителя/)).toHaveValue(
      "Уточните, пожалуйста, с какого времени нет услуги.",
    );
    fireEvent.change(screen.getByLabelText(/^Текст для заявителя/), { target: { value: " " } });
    click("Применить");
    expect(screen.getByText("Напишите текст: человек должен его увидеть")).toBeVisible();
    expect(stored()[0].status).toBe("accepted");

    fireEvent.change(screen.getByLabelText(/^Текст для заявителя/), {
      target: { value: "С какого часа?" },
    });
    click("Применить");
    expect(stored()[0].status).toBe("info_required");
    expect(
      screen.getByText(
        "Организация просит дополнить обращение. Ответьте, и оно вернётся в рассмотрение.",
      ),
    ).toBeVisible();

    choose(/^Ваше сообщение/, "С восьми утра");
    click("Отправить");
    expect(stored()[0].status).toBe("in_review");
    expect(stored()[0].events.at(-1)).toMatchObject({ actor: "applicant", text: "С восьми утра" });
    expect(screen.getByText("С восьми утра")).toBeVisible();
  });

  it("shows the answer and lets the person close the appeal", () => {
    seed(appeal(["accepted"], ["in_review"], ["answer_ready", "Линию починили"]));
    open();
    expect(screen.getByRole("heading", { name: "Ответ организации" })).toBeVisible();
    expect(screen.getAllByText("Линию починили").length).toBeGreaterThan(0);
    click("Закрыть обращение");
    expect(stored()[0].status).toBe("closed");
    expect(screen.getByText("Обращение закрыто, действий больше нет.")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Написать организации" })).toBeNull();
  });

  it("shows the reason of a refusal", () => {
    seed(appeal(["refused", "Не наша компетенция"]));
    open();
    expect(screen.getByRole("heading", { name: "Основание отказа" })).toBeVisible();
  });

  it("redirects to the region office and shows the number in the electronic system (11.6)", () => {
    seed(appeal(["accepted"]));
    open();
    choose(/^Действие/, "redirected");
    expect(
      screen.getByText("Обращение уйдёт в организацию: Управление ЖКХ Акмолинской области"),
    ).toBeVisible();
    click("Применить");
    expect(stored()[0]).toMatchObject({ status: "redirected", organizationId: "region-office" });
    expect(
      screen.getByText(/зарегистрировано в системе электронных обращений под номером ЭО-/),
    ).toBeVisible();
  });

  it("keeps a history of the dealings with who wrote what", () => {
    seed(appeal(["accepted"]));
    open();
    choose(/^Ваше сообщение/, "Свет пропал в 8:00");
    click("Отправить");
    const timeline = screen.getByRole("heading", { name: "История переписки" })
      .nextElementSibling as HTMLElement;
    const items = within(timeline).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[3]).toHaveTextContent("Вы");
    expect(items[3]).toHaveTextContent("Свет пропал в 8:00");
  });
});
