import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderInfo } from "@/features/account/domain/availability";
import {
  createProperty,
  requestVerification,
  type Property,
} from "@/features/account/domain/property";
import { PROPERTIES_KEY } from "@/features/account/domain/storage";
import { DEMO_PROFILES, SESSION_KEY } from "@/features/session/domain/session";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { stubChargeRepository } from "../data/stub-charge-repository";
import { periodOf, totalsOf, type Charge } from "../domain/charge";
import { connectedProviders } from "../domain/connected";
import { formatMoney } from "@/shared/lib/money";
import { createPayment, type Payment } from "../domain/payment";
import { PAYMENTS_KEY, parsePayments } from "../domain/storage";
import { ChargesPage, type BillingPageProps } from "./charges-page";
import { PayPage } from "./pay-page";
import { PaymentDetail } from "./payment-detail";
import { PaymentsList } from "./payments-list";
import { ReceiptPage } from "./receipt-page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
const download = vi.fn();
vi.mock("@/shared/lib/download-text", () => ({
  downloadText: (...args: unknown[]) => download(...args),
}));

const providers: ProviderInfo[] = [
  { id: "akmola-grid", name: "Электросети Акмолы", sector: "electricity", territories: "all" },
  { id: "akmola-water", name: "Водоканал Акмолы", sector: "water", territories: "all" },
  { id: "akmola-heat", name: "Теплосети Акмолы", sector: "heat", territories: "all" },
  { id: "akmola-gas", name: "Газ Акмола", sector: "gas", territories: "all" },
  { id: "region-eco", name: "Чистая область", sector: "waste", territories: ["atbasar"] },
];
const territories = [{ id: "atbasar", name: "Атбасарский район" }];
const base: BillingPageProps = { lang: "ru", dict: ru, territories, providers, missing: {} };
const now = new Date();
const current = periodOf(now);

/** A sum written the way the page shows it, with ordinary spaces (the test tools fold them). */
const money = (amount: number) => formatMoney(amount).replace(/ /g, " ");

function property(confirmed = true): Property {
  const made = createProperty(
    {
      territoryId: "atbasar",
      locality: "Мариновка",
      street: "улица Центральная",
      house: "1",
      flat: "",
      type: "house",
      relation: "owner",
      personalAccount: "12345678",
      ownerInfo: "Демо Житель",
    },
    "p-1",
    "demo-resident",
    now,
  );
  if (!confirmed) return made;
  const result = requestVerification(made, { method: "state_integration" }, now);
  if (!result.ok) throw new Error("setup failed");
  return result.property;
}

const feed = connectedProviders({ territoryId: "atbasar", without: [] }, providers);
const all: Charge[] = stubChargeRepository.listForProperty({
  propertyId: "p-1",
  providers: feed,
  now,
});
const currentCharges = all.filter((item) => item.period === current);
const payable = currentCharges.filter((item) => item.available);

const signIn = () =>
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES.resident));
const seedPayments = (...items: Payment[]) =>
  window.localStorage.setItem(PAYMENTS_KEY, JSON.stringify(items));
const stored = () => parsePayments(window.localStorage.getItem(PAYMENTS_KEY));
const choose = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

function payment(charges: Charge[] = payable, patch: Partial<Payment> = {}): Payment {
  return {
    ...createPayment(
      charges,
      "gateway",
      { id: "pay-1", ownerId: "demo-resident", address: "Мариновка, ул. Центральная, 1" },
      [],
      now,
    ),
    ...patch,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
  download.mockClear();
  signIn();
  window.localStorage.setItem(PROPERTIES_KEY, JSON.stringify([property()]));
});

describe("charges", () => {
  it("asks a guest to sign in and brings them back", () => {
    window.localStorage.removeItem(SESSION_KEY);
    render(<ChargesPage {...base} />);
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute(
      "href",
      "/ru/sign-in?next=%2Fru%2Fbilling",
    );
  });

  it("sends someone without a confirmed object to add one", () => {
    window.localStorage.setItem(PROPERTIES_KEY, JSON.stringify([property(false)]));
    render(<ChargesPage {...base} />);
    expect(screen.getByRole("heading", { name: "Нужен подтверждённый объект" })).toBeVisible();
  });

  it("shows every service of the object with the total to pay (9.3)", () => {
    render(<ChargesPage {...base} />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + currentCharges.length + 1);
    for (const item of currentCharges) {
      expect(within(table).getByText(item.providerName)).toBeVisible();
    }
    const overall = within(table).getByText("Всего к оплате").closest("tr") as HTMLElement;
    expect(overall).toHaveTextContent(money(totalsOf(currentCharges).total));
  });

  it("says that a provider has sent nothing fresh and shows when its data is from (9.8)", () => {
    render(<ChargesPage {...base} />);
    expect(screen.getByRole("heading", { name: "Данные временно недоступны" })).toBeVisible();
    expect(
      screen.getByText(/Поставщик «Чистая область» не передал свежие начисления/),
    ).toBeVisible();
  });

  it("shows the fields of the specification for each provider (9.2)", () => {
    render(<ChargesPage {...base} />);
    choose(/^Как показать/, "providers");
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(currentCharges.length);
    const gas = screen.getByRole("article", { name: "Газоснабжение, Газ Акмола" });
    for (const label of [
      "Поставщик",
      "Вид услуги",
      "Лицевой счёт",
      "Расчётный период",
      "Предыдущая задолженность",
      "Начислено за период",
      "Перерасчёты",
      "Пени",
      "Поступившие платежи",
      "Переплата",
      "Итого к оплате",
      "Начисление сформировано",
      "Срок оплаты",
      "Данные поставщика обновлены",
    ]) {
      expect(within(gas).getByText(label), label).toBeVisible();
    }
    const waste = screen.getByRole("article", { name: "Вывоз ТБО, Чистая область" });
    expect(within(waste).getByText("Поставщик срок не указал")).toBeVisible();
  });

  it("goes back six months", () => {
    render(<ChargesPage {...base} />);
    const options = Array.from(
      screen.getByLabelText(/^Расчётный период/).querySelectorAll("option"),
    );
    expect(options).toHaveLength(6);
    expect(options[0]).toHaveValue(current);
    choose(/^Расчётный период/, options[5].getAttribute("value") ?? "");
    const table = screen.getByRole("table");
    const old = all.filter((item) => item.period === options[5].getAttribute("value"));
    expect(within(table).getByText("Всего к оплате").closest("tr")).toHaveTextContent(
      money(totalsOf(old).total),
    );
  });

  it("takes a paid payment into the totals", () => {
    const gas = payable.find((item) => item.sector === "gas") as Charge;
    seedPayments(payment([gas], { status: "paid" }));
    render(<ChargesPage {...base} />);
    const row = screen.getByText("Газ Акмола").closest("tr") as HTMLElement;
    expect(row).toHaveTextContent(money(0));
    const overall = screen.getByText("Всего к оплате").closest("tr") as HTMLElement;
    expect(overall).toHaveTextContent(money(totalsOf(currentCharges).total - gas.total));
  });
});

describe("single receipt", () => {
  it("collects the services of the month with the payer, the address and the total (9.5)", () => {
    render(<ReceiptPage {...base} />);
    const receipt = screen.getByRole("article");
    expect(within(receipt).getByText("Демо Житель")).toBeVisible();
    expect(within(receipt).getByText(/Мариновка/)).toBeVisible();
    expect(within(receipt).getAllByRole("listitem")).toHaveLength(currentCharges.length);
    expect(within(receipt).getByText("Общая сумма к оплате").parentElement).toHaveTextContent(
      money(totalsOf(currentCharges).total),
    );
    expect(within(receipt).getByText(/данные на .* свежих нет/)).toBeVisible();
  });

  it("downloads the receipt for the chosen month (9.9)", () => {
    render(<ReceiptPage {...base} />);
    click("Скачать квитанцию (демо)");
    expect(download).toHaveBeenCalledTimes(1);
    const [name, text] = download.mock.calls[0] as [string, string];
    expect(name).toBe(`receipt-${current}.txt`);
    expect(text).toContain("ЕДИНАЯ КВИТАНЦИЯ");
    expect(text).toContain("ДЕМО");
    expect(text).toContain(money(totalsOf(currentCharges).total).replace(/ /g, " "));
  });

  it("offers the payment only for the current month", () => {
    render(<ReceiptPage {...base} />);
    expect(screen.getByRole("link", { name: "Перейти к оплате" })).toBeVisible();
    const options = Array.from(
      screen.getByLabelText(/^Расчётный период/).querySelectorAll("option"),
    );
    choose(/^Расчётный период/, options[1].getAttribute("value") ?? "");
    expect(screen.queryByRole("link", { name: "Перейти к оплате" })).toBeNull();
  });
});

describe("pay", () => {
  const checkboxes = () => screen.getAllByRole("checkbox");

  it("chooses everything that can be paid and leaves out the provider without fresh data", () => {
    render(<PayPage {...base} />);
    expect(checkboxes()).toHaveLength(payable.length);
    expect(screen.getByText("Данные поставщика недоступны")).toBeVisible();
    expect(screen.getByText("Итого к оплате").parentElement).toHaveTextContent(
      money(totalsOf(payable).total),
    );
  });

  it("changes the total with the choice (9.11)", () => {
    render(<PayPage {...base} />);
    fireEvent.click(checkboxes()[0]);
    expect(screen.getByText("Итого к оплате").parentElement).toHaveTextContent(
      money(totalsOf(payable).total - payable[0].total),
    );
    click("Снять выбор");
    expect(screen.getByText("Итого к оплате").parentElement).toHaveTextContent(money(0));
    click("Выбрать все, что можно оплатить");
    expect(checkboxes().every((box) => (box as HTMLInputElement).checked)).toBe(true);
  });

  it("will not start a payment for nothing", () => {
    render(<PayPage {...base} />);
    click("Снять выбор");
    click("Перейти к оплате");
    expect(screen.getByText("Выберите хотя бы одну услугу")).toBeVisible();
    expect(stored()).toEqual([]);
  });

  it("starts one payment for all chosen services and goes to its page (9.12)", () => {
    render(<PayPage {...base} />);
    choose(/^Способ оплаты/, "reference");
    click("Перейти к оплате");
    const [made] = stored();
    expect(made).toMatchObject({
      status: "awaiting_payment",
      method: "reference",
      total: totalsOf(payable).total,
      ownerId: "demo-resident",
      period: current,
    });
    expect(made.lines).toHaveLength(payable.length);
    expect(made.lines.map((line) => line.providerId)).toEqual(
      payable.map((item) => item.providerId),
    );
    expect(push).toHaveBeenCalledWith(`/ru/billing/payments/${made.id}`);
  });

  it("does not let a service be paid twice while a payment for it is on its way", () => {
    seedPayments(payment());
    render(<PayPage {...base} />);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getAllByText("Платёж по этой услуге уже начат")).toHaveLength(payable.length);
  });

  it("has nothing to pay when everything is paid", () => {
    seedPayments(payment(payable, { status: "paid" }));
    render(<PayPage {...base} />);
    expect(screen.getByText("Данные поставщика недоступны")).toBeVisible();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("never asks for card data", () => {
    render(<PayPage {...base} />);
    expect(screen.queryByLabelText(/карт/i, { selector: "input" })).toBeNull();
    expect(screen.getByText(/портал их не получает и не хранит/)).toBeVisible();
  });
});

describe("history of payments", () => {
  it("invites to pay when there is no payment", () => {
    render(<PaymentsList {...base} />);
    expect(screen.getByRole("heading", { name: "Платежей пока нет" })).toBeVisible();
  });

  it("lists payments with status and filters them", () => {
    seedPayments(
      payment([payable[0]], { id: "pay-1", number: "DEMO-PAY-2026-00001", status: "paid" }),
      payment([payable[1]], { id: "pay-2", number: "DEMO-PAY-2026-00002", status: "declined" }),
    );
    render(<PaymentsList {...base} />);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    choose(/^Статус/, "declined");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Найдено: 1")).toBeVisible();
  });

  it("does not show the payments of someone else", () => {
    seedPayments({ ...payment(), ownerId: "someone-else" });
    render(<PaymentsList {...base} />);
    expect(screen.getByRole("heading", { name: "Платежей пока нет" })).toBeVisible();
  });
});

describe("a payment", () => {
  const open = (id = "pay-1") => render(<PaymentDetail {...base} id={id} />);

  it("says when the payment is not found", () => {
    open("nope");
    expect(screen.getByRole("heading", { name: "Платёж не найден" })).toBeVisible();
  });

  it("shows how the payment splits between the providers and accounts (9.18)", () => {
    seedPayments(payment());
    open();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + payable.length + 1);
    for (const item of payable) {
      expect(within(table).getByText(new RegExp(item.personalAccount))).toBeVisible();
    }
    expect(within(table).getByText("Всего").closest("tr")).toHaveTextContent(
      money(totalsOf(payable).total),
    );
  });

  it("gives an identifier and a link when paying outside the portal (9.11)", () => {
    seedPayments(payment(payable, { method: "reference" }));
    open();
    expect(screen.getByText(/Идентификатор: PAY-/)).toBeVisible();
    expect(screen.getByText(/https:\/\/pay\.example\.test\/pay-/)).toBeVisible();
  });

  it("walks from awaiting to paid with the service reporting the results (9.15, 9.16)", () => {
    seedPayments(payment());
    open();
    click("Перейти в платёжный сервис");
    expect(stored()[0].status).toBe("initiated");

    choose(/^Результат платежа/, "processing");
    click("Сообщить порталу");
    expect(stored()[0].status).toBe("processing");

    choose(/^Результат платежа/, "paid");
    click("Сообщить порталу");
    expect(stored()[0].status).toBe("paid");
    expect(
      screen.getByText("Платёж прошёл. Поставщики получат деньги и учтут их в начислениях."),
    ).toBeVisible();

    click("Скачать подтверждение оплаты (демо)");
    const [name, text] = download.mock.calls[0] as [string, string];
    expect(name).toBe("DEMO-PAY-2026-00001.txt");
    expect(text).toContain("ПОДТВЕРЖДЕНИЕ ОПЛАТЫ");
  });

  it("does not credit the same notice twice (9.17)", () => {
    seedPayments(payment());
    open();
    choose(/^Результат платежа/, "processing");
    click("Сообщить порталу");
    const before = stored()[0];

    click("Повторить последнее уведомление");
    expect(screen.getByText("Это уведомление уже учтено, платёж не задвоен.")).toBeVisible();
    expect(stored()[0]).toEqual(before);
    expect(stored()[0].history).toHaveLength(2);
  });

  it("can be cancelled before the service has taken it, and then has no more steps", () => {
    seedPayments(payment());
    open();
    click("Отменить платёж");
    expect(stored()[0].status).toBe("cancelled");
    expect(screen.queryByRole("button", { name: "Отменить платёж" })).toBeNull();
    expect(screen.getByText("Платёж завершён, новых уведомлений нет.")).toBeVisible();
  });

  it("offers a way to wait for the bank and to refund", () => {
    seedPayments(payment(payable, { status: "processing" }));
    open();
    const results = within(screen.getByLabelText(/^Результат платежа/)).getAllByRole("option");
    expect(results.map((option) => option.getAttribute("value"))).toEqual([
      "",
      "paid",
      "declined",
      "awaiting_confirmation",
    ]);
  });
});
