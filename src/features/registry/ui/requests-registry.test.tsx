import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { ProviderInfo } from "@/features/account/domain/availability";
import {
  createProperty,
  requestVerification,
  type Property,
} from "@/features/account/domain/property";
import { PROPERTIES_KEY } from "@/features/account/domain/storage";
import { createApplication, changeStatus } from "@/features/applications/domain/application";
import {
  APPLICATIONS_KEY,
  DEMO_PROFILES,
  SESSION_KEY,
  operatorSession,
} from "@/features/applications/domain/storage";
import {
  createDraft,
  providerChange,
  type ContractApplication,
} from "@/features/contracts/domain/contract";
import { CONTRACTS_KEY } from "@/features/contracts/domain/storage";
import {
  createRequest,
  emptyRequestInput,
  requestProviderChange,
  type MeterRequest,
} from "@/features/meters/domain/meter-request";
import { METER_REQUESTS_KEY } from "@/features/meters/domain/storage";
import { createAppeal, emptyAppealInput, executorStep } from "@/features/appeals/domain/appeal";
import { APPEALS_KEY } from "@/features/appeals/domain/storage";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { RequestsRegistry } from "./requests-registry";

const providers: ProviderInfo[] = [
  { id: "akmola-water", name: "Водоканал Акмолы", sector: "water", territories: "all" },
  { id: "akmola-heat", name: "Теплосети Акмолы", sector: "heat", territories: "all" },
  { id: "akmola-gas", name: "Газ Акмола", sector: "gas", territories: "all" },
];
const props = { lang: "ru", dict: ru, providers, missing: {} } as const;
const now = new Date();
const old = new Date("2026-01-10T06:00:00Z");

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

const application = (at: Date, finished = false) => {
  const made = createApplication({
    serviceSlug: "gas-contract",
    serviceTitle: "Заключение договора на газ",
    organizationId: "akmola-gas",
    ownerRole: "resident",
    ownerName: "Демо Житель",
    form: {
      territoryId: "kokshetau",
      address: "Кокшетау, улица Абая, 10",
      attached: [],
      comment: "Прошу подключить",
      consent: true,
    },
    number: "DEMO-2026-00001",
    now: at,
  });
  if (!finished) return made;
  const working = changeStatus(made, "in_progress", at);
  if (!working.ok) throw new Error("setup failed");
  const done = changeStatus(working.application, "done", at);
  if (!done.ok) throw new Error("setup failed");
  return done.application;
};

function contract(patch: Partial<ContractApplication> = {}): ContractApplication {
  return {
    ...createDraft(
      {
        propertyId: "p-1",
        sector: "water",
        serviceSlug: "water-contract-resident",
        serviceTitle: "Заключение договора на водоснабжение",
        providerId: "akmola-water",
        providerName: "Водоканал Акмолы",
        applicant: {
          lastName: "Иванов",
          firstName: "Иван",
          middleName: "",
          iin: "900101300123",
          phone: "+77011234567",
          email: "",
        },
        address: "Мариновка, улица Центральная, 1",
        propertyType: "house",
        basis: "owner",
        personalAccount: "12345678",
      },
      "c-1",
      "demo-resident",
      now,
    ),
    ...patch,
  };
}

function meterRequest(patch: Partial<MeterRequest> = {}): MeterRequest {
  return {
    ...createRequest(
      {
        ...emptyRequestInput("fault", "+77011234567"),
        propertyId: "p-1",
        resource: "heat",
        meterId: "m-1",
        reason: "no_display",
        details: { faultInfo: "Нет изображения" },
        slots: [{ date: "2099-01-05", time: "day" }],
      },
      { id: "q-1", ownerId: "demo-resident", address: "Мариновка, улица Центральная, 1" },
      [],
      now,
    ),
    ...patch,
  };
}

const signIn = () =>
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES.resident));
const seed = (key: string, ...items: unknown[]) =>
  window.localStorage.setItem(key, JSON.stringify(items));
const choose = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  window.localStorage.clear();
  signIn();
  seed(PROPERTIES_KEY, property());
});

describe("RequestsRegistry", () => {
  it("asks a guest to sign in and brings them back", () => {
    window.localStorage.removeItem(SESSION_KEY);
    render(<RequestsRegistry {...props} />);
    expect(screen.getByRole("heading", { name: "Войдите, чтобы увидеть заявки" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute(
      "href",
      "/ru/sign-in?next=%2Fru%2Fapplications",
    );
  });

  it("tells an operator this is not their page", () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(operatorSession("akmola-gas")));
    render(<RequestsRegistry {...props} />);
    expect(screen.getByText("Оператор видит заявки в своём кабинете.")).toBeVisible();
  });

  it("invites to order a service when there is nothing", () => {
    render(<RequestsRegistry {...props} />);
    expect(screen.getByRole("heading", { name: "Пока нет заявок" })).toBeVisible();
  });

  it("puts services, contracts and meter requests in one list, newest first (10.1, 10.2)", () => {
    seed(APPLICATIONS_KEY, application(old));
    seed(CONTRACTS_KEY, {
      ...contract(),
      status: "registered",
      number: "DEMO-DOG-2026-00001",
      submittedAt: "2026-10-02T06:00:00.000Z",
    });
    seed(METER_REQUESTS_KEY, meterRequest({ createdAt: "2026-10-05T06:00:00.000Z" }));
    render(<RequestsRegistry {...props} />);
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
      expect.stringContaining("Неисправность счётчика"),
      expect.stringContaining("Заключение договора на водоснабжение"),
      expect.stringContaining("Заключение договора на газ"),
    ]);
  });

  it("shows the fields of the specification for a request (10.3)", () => {
    seed(METER_REQUESTS_KEY, meterRequest());
    render(<RequestsRegistry {...props} />);
    const card = screen.getByRole("article");
    const value = (label: string) => within(card).getByText(label).nextElementSibling;
    expect(value("Номер")).toHaveTextContent("DEMO-ZPR-");
    expect(value("Подана")).toHaveTextContent("UTC");
    expect(value("Объект")).toHaveTextContent("Мариновка, улица Центральная, 1");
    expect(value("Организация")).toHaveTextContent("Теплосети Акмолы");
    expect(value("Описание")).toHaveTextContent("Нет изображения на табло. Нет изображения");
    expect(value("Исполнитель")).toHaveTextContent("Пока не назначен");
    expect(value("Срок рассмотрения")).not.toHaveTextContent("—");
    expect(within(card).getByText("Зарегистрирована")).toBeVisible();
  });

  it("writes that a draft has no number yet and that a late request has missed its day", () => {
    seed(CONTRACTS_KEY, contract());
    seed(APPLICATIONS_KEY, application(old));
    render(<RequestsRegistry {...props} />);
    expect(screen.getByText("Номер появится после отправки")).toBeVisible();
    expect(screen.getByText(/срок прошёл/)).toBeVisible();
  });

  it("offers to correct a returned application and to ask for a service again (10.5)", () => {
    const reviewed = providerChange(
      {
        ...contract(),
        status: "registered",
        number: "DEMO-DOG-2026-00001",
        submittedAt: now.toISOString(),
      },
      "under_review",
      now,
    );
    if (!reviewed.ok) throw new Error(`setup failed: ${reviewed.reason}`);
    const returned = providerChange(
      reviewed.application,
      "returned_for_revision",
      now,
      "Приложите документ",
    );
    if (!returned.ok) throw new Error(`setup failed: ${returned.reason}`);
    seed(CONTRACTS_KEY, returned.application);
    const asked = (() => {
      let current = meterRequest();
      const step = requestProviderChange(current, "info_requested", now, { note: "Нужен номер" });
      if (!step.ok) throw new Error("setup failed");
      current = step.request;
      return current;
    })();
    seed(METER_REQUESTS_KEY, asked);
    render(<RequestsRegistry {...props} />);

    expect(screen.getByRole("link", { name: "Исправить и подать повторно" })).toHaveAttribute(
      "href",
      "/ru/contracts/c-1",
    );
    expect(screen.getByRole("link", { name: "Подать заявку заново" })).toHaveAttribute(
      "href",
      "/ru/meters/order/fault?meter=m-1",
    );
    expect(screen.getByText("Приложите документ")).toBeVisible();
    expect(screen.getByText("Нужен номер")).toBeVisible();
  });

  it("keeps finished requests in the archive with their result (10.6, 10.7)", () => {
    seed(APPLICATIONS_KEY, application(old, true));
    seed(METER_REQUESTS_KEY, meterRequest());
    render(<RequestsRegistry {...props} />);

    choose(/^Показать/, "archive");
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByText("Рассмотрена положительно")).toBeVisible();
    expect(within(cards[0]).getByText("Срок рассмотрения").nextElementSibling).toHaveTextContent(
      "—",
    );
    expect(screen.getByText("Найдено: 1")).toBeVisible();
  });

  it("filters by kind and by a word of the number, the address or the service", () => {
    seed(APPLICATIONS_KEY, application(old));
    seed(METER_REQUESTS_KEY, meterRequest());
    render(<RequestsRegistry {...props} />);

    choose(/^Вид заявки/, "meter");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    choose(/^Вид заявки/, "");
    fireEvent.change(screen.getByLabelText(/^Поиск/), { target: { value: "абая" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText(/^Поиск/), { target: { value: "ничего" } });
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByText("По этим условиям заявок нет.")).toBeVisible();
  });

  it("offers only the kinds the person has and counts the states", () => {
    seed(METER_REQUESTS_KEY, meterRequest());
    render(<RequestsRegistry {...props} />);
    const kinds = Array.from(screen.getByLabelText(/^Вид заявки/).querySelectorAll("option")).map(
      (option) => option.textContent,
    );
    expect(kinds).toEqual(["Все", "Счётчики"]);
    const states = Array.from(screen.getByLabelText(/^Показать/).querySelectorAll("option")).map(
      (option) => option.textContent,
    );
    expect(states).toEqual(["Все", "В работе (1)", "Ждут вашего действия (0)", "Архив (0)"]);
  });

  it("does not show the requests of someone else", () => {
    seed(CONTRACTS_KEY, { ...contract(), ownerId: "someone-else" });
    seed(METER_REQUESTS_KEY, { ...meterRequest(), ownerId: "someone-else" });
    render(<RequestsRegistry {...props} />);
    expect(screen.getByRole("heading", { name: "Пока нет заявок" })).toBeVisible();
  });

  it("includes appeals and asks the person to answer a question of the organization", () => {
    let made = createAppeal(
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
        organization: { id: "grid", name: "Электросети Акмолы" },
      },
      [],
      now,
    );
    for (const [to, text] of [
      ["accepted", ""],
      ["info_required", "С какого часа?"],
    ] as const) {
      const step = executorStep(made, to, text, now);
      if (!step.ok) throw new Error("setup failed");
      made = step.appeal;
    }
    seed(APPEALS_KEY, made);
    render(<RequestsRegistry {...props} />);

    const card = screen.getByRole("article");
    expect(within(card).getByText("Перебои в электроснабжении")).toBeVisible();
    expect(within(card).getByText("Электросети Акмолы")).toBeVisible();
    expect(within(card).getByText("С какого часа?")).toBeVisible();
    expect(screen.getByRole("link", { name: "Ответить организации" })).toHaveAttribute(
      "href",
      "/ru/appeals/a-1",
    );
    const kinds = Array.from(screen.getByLabelText(/^Вид заявки/).querySelectorAll("option")).map(
      (option) => option.textContent,
    );
    expect(kinds).toEqual(["Все", "Обращение"]);
  });
});
