import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { ProviderInfo } from "@/features/account/domain/availability";
import { createProperty, type Property } from "@/features/account/domain/property";
import { PROPERTIES_KEY } from "@/features/account/domain/storage";
import { createAppeal, emptyAppealInput } from "@/features/appeals/domain/appeal";
import { APPEALS_KEY, parseAppeals } from "@/features/appeals/domain/storage";
import {
  DEMO_PROFILES,
  SESSION_KEY,
  operatorSession,
} from "@/features/applications/domain/storage";
import type { Charge } from "@/features/billing/domain/charge";
import { createPayment } from "@/features/billing/domain/payment";
import { PAYMENTS_KEY } from "@/features/billing/domain/storage";
import { createDraft, type ContractApplication } from "@/features/contracts/domain/contract";
import { CONTRACTS_KEY, parseContracts } from "@/features/contracts/domain/storage";
import { createMeter, emptyMeterInput } from "@/features/meters/domain/meter";
import {
  createRequest,
  emptyRequestInput,
  requestProviderChange,
  type MeterRequest,
} from "@/features/meters/domain/meter-request";
import { submitReading } from "@/features/meters/domain/reading";
import {
  METERS_KEY,
  METER_REQUESTS_KEY,
  READINGS_KEY,
  parseMeterRequests,
  parseReadings,
} from "@/features/meters/domain/storage";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { AUDIT_KEY, parseAudit } from "../domain/audit";
import { OperatorAppeals } from "./operator-appeals";
import { OperatorAudit } from "./operator-audit";
import { OperatorCalendar } from "./operator-calendar";
import { OperatorContracts } from "./operator-contracts";
import { OperatorMeters } from "./operator-meters";
import { OperatorPayments } from "./operator-payments";
import { OperatorReadings } from "./operator-readings";

const providers: ProviderInfo[] = [
  { id: "akmola-water", name: "Водоканал Акмолы", sector: "water", territories: ["kokshetau"] },
  { id: "atbasar-water", name: "Водоканал Атбасара", sector: "water", territories: ["atbasar"] },
  { id: "akmola-gas", name: "Газ Акмола", sector: "gas", territories: "all" },
];
const props = { lang: "ru", dict: ru, providers } as const;
const now = new Date();

const property = (id: string, territoryId: string): Property =>
  createProperty(
    {
      territoryId,
      locality: "Н",
      street: "улица Абая",
      house: "1",
      flat: "",
      type: "house",
      relation: "owner",
      personalAccount: "",
      ownerInfo: "Иван",
    },
    id,
    "demo-resident",
    now,
  );

const meter = (id: string, propertyId: string) =>
  createMeter(
    {
      ...emptyMeterInput(),
      resource: "cold_water",
      type: "mechanical",
      serial: id.toUpperCase(),
      installedAt: "2024-05-01",
      initialReading: "100",
    },
    { id, ownerId: "demo-resident", propertyId, address: `Адрес ${propertyId}` },
    now,
  );

function contract(
  id: string,
  providerId: string,
  patch: Partial<ContractApplication> = {},
): ContractApplication {
  return {
    ...createDraft(
      {
        propertyId: "p-1",
        sector: "water",
        serviceSlug: "water-contract-resident",
        serviceTitle: "Договор на воду",
        providerId,
        providerName: "Поставщик",
        applicant: {
          lastName: "Иванов",
          firstName: "Иван",
          middleName: "",
          iin: "900101300123",
          phone: "+77011234567",
          email: "",
        },
        address: "Кокшетау, улица Абая, 1",
        propertyType: "house",
        basis: "owner",
        personalAccount: "",
      },
      id,
      "demo-resident",
      now,
    ),
    status: "registered",
    number: `DEMO-DOG-2026-0000${id.slice(-1)}`,
    submittedAt: now.toISOString(),
    ...patch,
  };
}

function request(id: string, propertyId: string, meterId: string): MeterRequest {
  return createRequest(
    {
      ...emptyRequestInput("fault", "+77011234567"),
      propertyId,
      resource: "cold_water",
      meterId,
      reason: "leak",
      details: { faultInfo: "течёт" },
      slots: [{ date: "2099-01-05", time: "day" }],
    },
    { id, ownerId: "demo-resident", address: `Адрес ${propertyId}` },
    [],
    now,
  );
}

const seed = (key: string, ...items: unknown[]) =>
  window.localStorage.setItem(key, JSON.stringify(items));
const signInOperator = (organizationId = "akmola-water") =>
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(operatorSession(organizationId)));
const choose = (label: RegExp, value: string, within_: HTMLElement | undefined = undefined) =>
  fireEvent.change((within_ ? within(within_) : screen).getByLabelText(label), {
    target: { value },
  });
const click = (name: string | RegExp, scope?: HTMLElement) =>
  fireEvent.click((scope ? within(scope) : screen).getByRole("button", { name }));
const audit = () => parseAudit(window.localStorage.getItem(AUDIT_KEY));

beforeEach(() => {
  window.localStorage.clear();
  signInOperator();
});

describe("who gets into the cabinet", () => {
  it("asks a guest to sign in as an operator", () => {
    window.localStorage.removeItem(SESSION_KEY);
    render(<OperatorContracts {...props} />);
    expect(screen.getByRole("heading", { name: "Нужен вход оператора" })).toBeVisible();
  });

  it("tells a resident the section is not for them", () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES.resident));
    render(<OperatorContracts {...props} />);
    expect(
      screen.getByText("Этот раздел только для оператора. Войдите как оператор."),
    ).toBeVisible();
  });

  it("shows the eight sections of the cabinet", () => {
    render(<OperatorContracts {...props} />);
    const nav = screen.getByRole("navigation", { name: "Разделы кабинета организации" });
    expect(within(nav).getAllByRole("link")).toHaveLength(8);
    expect(within(nav).getByRole("link", { name: "Договоры" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Журнал действий" })).toHaveAttribute(
      "href",
      "/ru/operator/audit",
    );
  });
});

describe("contracts", () => {
  it("shows only the contracts of the own provider and not the drafts", () => {
    seed(
      CONTRACTS_KEY,
      contract("c-1", "akmola-water"),
      contract("c-2", "akmola-gas"),
      contract("c-3", "akmola-water", { status: "draft", number: undefined }),
    );
    render(<OperatorContracts {...props} />);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("DEMO-DOG-2026-00001")).toBeVisible();
  });

  it("shows the applicant with the iin hidden, and the documents", () => {
    seed(CONTRACTS_KEY, contract("c-1", "akmola-water"));
    render(<OperatorContracts {...props} />);
    const card = screen.getByRole("article");
    expect(within(card).getByText("Иванов Иван")).toBeVisible();
    expect(within(card).getByText("900101••••23")).toBeInTheDocument();
    expect(within(card).queryByText("900101300123")).toBeNull();
  });

  it("needs a reason to return, passes the remarks to the person and writes the journal (12.4, 12.7)", () => {
    seed(CONTRACTS_KEY, contract("c-1", "akmola-water"));
    render(<OperatorContracts {...props} />);
    const card = screen.getByRole("article");
    choose(/^Действие/, "under_review", card);
    click("Применить", card);
    expect(parseContracts(window.localStorage.getItem(CONTRACTS_KEY))[0].status).toBe(
      "under_review",
    );

    choose(/^Действие/, "returned_for_revision", card);
    fireEvent.change(within(card).getByLabelText(/^Замечания или причина/), {
      target: { value: " " },
    });
    click("Применить", card);
    expect(
      within(card).getByText("Укажите причину или замечания: заявитель должен их увидеть"),
    ).toBeVisible();

    fireEvent.change(within(card).getByLabelText(/^Замечания или причина/), {
      target: { value: "Нет документа" },
    });
    click("Применить", card);
    const saved = parseContracts(window.localStorage.getItem(CONTRACTS_KEY))[0];
    expect(saved).toMatchObject({ status: "returned_for_revision", remarks: "Нет документа" });

    expect(audit().map((entry) => [entry.entity, entry.from, entry.to])).toEqual([
      ["contract", "under_review", "returned_for_revision"],
      ["contract", "registered", "under_review"],
    ]);
    expect(audit()[0]).toMatchObject({
      actor: "Демо Оператор",
      organizationId: "akmola-water",
      note: "Нет документа",
    });
  });

  it("assigns a personal account and refuses a wrong one", () => {
    seed(CONTRACTS_KEY, contract("c-1", "akmola-water"));
    render(<OperatorContracts {...props} />);
    const card = screen.getByRole("article");
    choose(/^Лицевой счёт/, "12", card);
    click("Сохранить лицевой счёт", card);
    expect(within(card).getByText("Лицевой счёт — от 6 до 12 цифр")).toBeVisible();

    choose(/^Лицевой счёт/, "12345678", card);
    click("Сохранить лицевой счёт", card);
    expect(parseContracts(window.localStorage.getItem(CONTRACTS_KEY))[0].personalAccount).toBe(
      "12345678",
    );
    expect(audit()[0]).toMatchObject({ action: "account", to: "12345678" });
  });

  it("filters by status and by number", () => {
    seed(
      CONTRACTS_KEY,
      contract("c-1", "akmola-water"),
      contract("c-2", "akmola-water", { status: "under_review" }),
    );
    render(<OperatorContracts {...props} />);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    choose(/^Статус/, "under_review");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    choose(/^Статус/, "");
    fireEvent.change(screen.getByLabelText(/^Поиск/), { target: { value: "00002" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });
});

describe("meter requests and readings are scoped to the area of the organization (12.3)", () => {
  beforeEach(() => {
    seed(PROPERTIES_KEY, property("p-1", "kokshetau"), property("p-2", "atbasar"));
    seed(METERS_KEY, meter("m-1", "p-1"), meter("m-2", "p-2"));
  });

  it("shows only the requests of the objects it serves", () => {
    seed(METER_REQUESTS_KEY, request("q-1", "p-1", "m-1"), {
      ...request("q-2", "p-2", "m-2"),
      number: "DEMO-ZPR-2026-00002",
    });
    render(<OperatorMeters {...props} />);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Адрес p-1")).toBeVisible();
  });

  it("takes a request in work, plans it, and the journal remembers (12.6, 12.7)", () => {
    seed(METER_REQUESTS_KEY, request("q-1", "p-1", "m-1"));
    render(<OperatorMeters {...props} />);
    const card = screen.getByRole("article");
    choose(/^Действие/, "in_progress", card);
    click("Применить", card);
    expect(parseMeterRequests(window.localStorage.getItem(METER_REQUESTS_KEY))[0].status).toBe(
      "in_progress",
    );
    expect(audit()[0]).toMatchObject({
      entity: "meter_request",
      from: "registered",
      to: "in_progress",
    });
  });

  it("shows only the readings of the meters it reads, and accepts one", () => {
    const send = (m: ReturnType<typeof meter>, id: string) => {
      const result = submitReading(
        m,
        [],
        {
          valueText: "120",
          readingDate: now.toISOString().slice(0, 10),
          authentic: true,
          decreaseConfirmed: false,
        },
        { id, ownerId: "demo-resident" },
        now,
      );
      if (!result.ok) throw new Error("setup failed");
      return result.reading;
    };
    seed(READINGS_KEY, send(meter("m-1", "p-1"), "r-1"), {
      ...send(meter("m-2", "p-2"), "r-2"),
      number: "DEMO-POK-2026-00002",
    });
    render(<OperatorReadings {...props} />);
    const card = screen.getByRole("article");
    expect(within(card).getByText("Адрес p-1")).toBeVisible();
    choose(/^Действие/, "accepted", card);
    click("Применить", card);
    expect(parseReadings(window.localStorage.getItem(READINGS_KEY))[0].status).toBe("accepted");
    expect(audit()[0]).toMatchObject({ entity: "reading", to: "accepted" });
  });

  it("puts the planned visits in a calendar by day and the waiting ones apart (12.6)", () => {
    let planned = request("q-1", "p-1", "m-1");
    for (const [to, extra] of [
      ["in_progress", {}],
      ["scheduled", { slot: { date: "2099-01-05", time: "day" as const }, assignee: "Сергеев А." }],
    ] as const) {
      const step = requestProviderChange(planned, to, now, extra);
      if (!step.ok) throw new Error("setup failed");
      planned = step.request;
    }
    const waiting = requestProviderChange(
      { ...request("q-3", "p-1", "m-1"), number: "DEMO-ZPR-2026-00003" },
      "in_progress",
      now,
    );
    if (!waiting.ok) throw new Error("setup failed");
    seed(METER_REQUESTS_KEY, planned, waiting.request);
    render(<OperatorCalendar {...props} />);
    expect(screen.getByRole("heading", { name: /5 января 2099/ })).toBeVisible();
    expect(screen.getByText(/Сергеев А\./)).toBeVisible();
    const queue = screen
      .getByRole("heading", { name: "Ждут назначения" })
      .closest("section") as HTMLElement;
    expect(within(queue).getByText(/DEMO-ZPR-2026-00003/)).toBeVisible();
  });
});

describe("appeals, payments and the journal", () => {
  it("shows only the appeals sent to the organization and lets it answer", () => {
    const make = (id: string, organizationId: string) =>
      createAppeal(
        {
          ...emptyAppealInput("+77011234567"),
          category: "water_cut" as never,
          subcategory: "no_water",
          address: "Абая, 10",
          description: "Воды нет с утра, соседи тоже",
        },
        { id, ownerId: "demo-resident", organization: { id: organizationId, name: "Орг" } },
        [],
        now,
      );
    seed(APPEALS_KEY, make("a-1", "akmola-water"), make("a-2", "akmola-gas"));
    render(<OperatorAppeals {...props} />);
    const card = screen.getByRole("article");
    choose(/^Действие/, "accepted", card);
    click("Применить", card);
    expect(parseAppeals(window.localStorage.getItem(APPEALS_KEY))[0].status).toBe("accepted");
    expect(audit()[0]).toMatchObject({
      entity: "appeal",
      from: "sent_to_executor",
      to: "accepted",
    });
  });

  it("shows only its own share of each payment and the sum received", () => {
    const charge = (providerId: string, sector: Charge["sector"], total: number): Charge => ({
      id: `p-1:${providerId}:2026-10`,
      propertyId: "p-1",
      providerId,
      providerName: providerId,
      sector,
      personalAccount: "11112222",
      period: "2026-10",
      previousDebt: 0,
      accrued: total,
      recalculated: 0,
      penalty: 0,
      paid: 0,
      overpayment: 0,
      total,
      generatedAt: "2026-10-01T06:00:00.000Z",
      updatedAt: "2026-10-05T06:00:00.000Z",
      available: true,
    });
    const paid = {
      ...createPayment(
        [charge("akmola-water", "water", 4000), charge("akmola-gas", "gas", 6000)],
        "gateway",
        { id: "pay-1", ownerId: "demo-resident", address: "Адрес" },
        [],
        now,
      ),
      status: "paid" as const,
    };
    seed(PAYMENTS_KEY, paid);
    render(<OperatorPayments {...props} />);
    expect(
      screen.getByText("Получено по оплаченным платежам: 4 000 ₸".replace(/ /g, " ")),
    ).toBeVisible();
    const card = screen.getByRole("article");
    expect(within(card).getByText("4 000 ₸")).toBeVisible();
    expect(within(card).queryByText("6 000 ₸")).toBeNull();
  });

  it("writes every action to the journal of its own organization only, and filters it", () => {
    seed(CONTRACTS_KEY, contract("c-1", "akmola-water"));
    window.localStorage.setItem(
      AUDIT_KEY,
      JSON.stringify([
        {
          id: "e-0",
          at: "2026-10-01T06:00:00.000Z",
          organizationId: "akmola-gas",
          actor: "Другой",
          entity: "reading",
          entityId: "r",
          number: "DEMO-POK-2026-00009",
          action: "status",
          from: "registered",
          to: "accepted",
        },
      ]),
    );
    const { unmount } = render(<OperatorContracts {...props} />);
    const card = screen.getByRole("article");
    choose(/^Действие/, "under_review", card);
    click("Применить", card);
    unmount();

    render(<OperatorAudit {...props} />);
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(2);
    expect(within(rows[1]).getByText("Демо Оператор")).toBeVisible();
    expect(within(rows[1]).getByText(/Заявление зарегистрировано → /)).toBeVisible();
    expect(screen.queryByText("DEMO-POK-2026-00009")).toBeNull();
    choose(/^Что показать/, "contract");
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("says when there is nothing to show yet", () => {
    render(<OperatorAudit {...props} />);
    expect(screen.getByText("Действий пока нет.")).toBeVisible();
  });
});
