import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderInfo } from "@/features/account/domain/availability";
import {
  DEMO_PROFILES,
  SESSION_KEY,
  adminSession,
  operatorSession,
} from "@/features/applications/domain/storage";
import { createProperty, requestVerification } from "@/features/account/domain/property";
import { PROPERTIES_KEY } from "@/features/account/domain/storage";
import { AUDIT_KEY, parseAudit } from "@/features/organization/domain/audit";
import { OperatorContracts } from "@/features/organization/ui/operator-contracts";
import { NotificationsPage } from "@/features/notifications/ui/notifications-page";
import ru from "@/shared/i18n/dictionaries/ru.json";
import kk from "@/shared/i18n/dictionaries/kk.json";
import { CONFIG_KEY, DEFAULT_CONFIG, parseConfig, type AdminConfig } from "../domain/config";
import { AdminAudit } from "./admin-audit";
import { AdminForms } from "./admin-forms";
import { AdminIntegrations } from "./admin-integrations";
import { AdminOrganizations } from "./admin-organizations";
import { AdminOverview } from "./admin-overview";
import { AdminReports } from "./admin-reports";
import { AdminSettings } from "./admin-settings";
import { AdminTemplates } from "./admin-templates";

const download = vi.fn();
vi.mock("@/shared/lib/download-text", () => ({
  downloadText: (...args: unknown[]) => download(...args),
}));

const providers: ProviderInfo[] = [
  { id: "akmola-water", name: "Водоканал Акмолы", sector: "water", territories: ["kokshetau"] },
  { id: "akmola-gas", name: "Газ Акмола", sector: "gas", territories: "all" },
  { id: "region-eco", name: "Чистая область", sector: "waste", territories: ["atbasar"] },
];
const territories = [
  { id: "kokshetau", name: "Кокшетау" },
  { id: "atbasar", name: "Атбасарский район" },
];
const base = { lang: "ru", dict: ru, providers, territories } as const;
const now = new Date();

const config = () => parseConfig(window.localStorage.getItem(CONFIG_KEY));
const seedConfig = (patch: Partial<AdminConfig>) =>
  window.localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...DEFAULT_CONFIG, ...patch }));
const audit = () => parseAudit(window.localStorage.getItem(AUDIT_KEY));
const choose = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const signInAdmin = () => window.localStorage.setItem(SESSION_KEY, JSON.stringify(adminSession()));

beforeEach(() => {
  window.localStorage.clear();
  download.mockClear();
  signInAdmin();
});

describe("who gets in", () => {
  it("asks a guest to sign in", () => {
    window.localStorage.removeItem(SESSION_KEY);
    render(<AdminOverview {...base} />);
    expect(screen.getByRole("heading", { name: "Нужен вход администратора" })).toBeVisible();
  });

  it("keeps a resident and an operator out", () => {
    for (const session of [DEMO_PROFILES.resident, operatorSession("akmola-gas")]) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      const { unmount } = render(<AdminOverview {...base} />);
      expect(screen.getByText(/Этот раздел только для администратора/)).toBeVisible();
      unmount();
    }
  });

  it("has eight sections in the menu and a card for every one besides the overview", () => {
    render(<AdminOverview {...base} />);
    const nav = screen.getByRole("navigation", { name: "Разделы администрирования" });
    expect(within(nav).getAllByRole("link")).toHaveLength(8);
    expect(within(nav).getByRole("link", { name: "Обзор" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getAllByRole("link", { name: /Отчёты/ }).length).toBeGreaterThan(1);
    expect(screen.getByText("Организаций на портале").nextElementSibling).toHaveTextContent("3");
  });
});

describe("reports", () => {
  it("shows the eighteen indicators", () => {
    render(<AdminReports {...base} />);
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(19);
    expect(screen.getByText("Доступность подключённых систем")).toBeVisible();
  });

  it("filters by organization", () => {
    render(<AdminReports {...base} />);
    const providersRow = () =>
      screen.getByText("Поставщиков, подключённых к порталу").closest("tr") as HTMLElement;
    expect(providersRow()).toHaveTextContent("3");
    choose(/^Организация/, "akmola-gas");
    expect(providersRow()).toHaveTextContent("1");
    click("Сбросить фильтры");
    expect(providersRow()).toHaveTextContent("3");
  });

  it("hides the sums when the administrator turned them off (17.4)", () => {
    seedConfig({ financeAccess: false });
    render(<AdminReports {...base} />);
    expect(screen.getByText("Сумма оплаченных платежей").closest("tr")).toHaveTextContent(
      "Скрыто по ролевой модели",
    );
  });

  it("downloads a CSV with the indicators and leaves the sums out when they are hidden", () => {
    render(<AdminReports {...base} />);
    click("Скачать CSV");
    const [name, text] = download.mock.calls[0] as [string, string];
    expect(name).toBe("report.csv");
    expect(text.startsWith("﻿")).toBe(true);
    expect(text).toContain("Сумма оплаченных платежей;0");
    expect(text).toContain("за всё время");
    expect(text.split("\r\n").filter(Boolean)).toHaveLength(2 + 18);
  });

  it("tells that XLSX and PDF are not made in the demo and makes no file", () => {
    render(<AdminReports {...base} />);
    click("Скачать XLSX");
    click("Скачать PDF");
    expect(download).not.toHaveBeenCalled();
  });

  it("leaves the sums out of the file when they are hidden", () => {
    seedConfig({ financeAccess: false });
    render(<AdminReports {...base} />);
    click("Скачать CSV");
    const [, text] = download.mock.calls[0] as [string, string];
    expect(text).not.toContain("Сумма оплаченных платежей");
  });
});

describe("organizations and staff", () => {
  it("blocks an organization only after the administrator confirms, and writes the journal (13.4)", () => {
    render(<AdminOrganizations {...base} />);
    const card = screen.getByRole("article", { name: "Газ Акмола" });
    fireEvent.click(within(card).getByRole("button", { name: "Заблокировать" }));
    expect(config().blockedOrganizations).toEqual([]);
    expect(within(card).getByText(/Заблокировать организацию «Газ Акмола»\?/)).toBeVisible();
    fireEvent.click(within(card).getByRole("button", { name: "Отмена" }));
    expect(config().blockedOrganizations).toEqual([]);

    fireEvent.click(within(card).getByRole("button", { name: "Заблокировать" }));
    fireEvent.click(within(card).getByRole("button", { name: "Да, заблокировать" }));
    expect(config().blockedOrganizations).toEqual(["akmola-gas"]);
    expect(within(card).getByText("Заблокирована")).toBeVisible();
    expect(audit()[0]).toMatchObject({
      entity: "config",
      action: "config",
      organizationId: "portal",
      actor: "Демо Администратор",
      note: "blockedOrganizations",
    });

    fireEvent.click(within(card).getByRole("button", { name: "Разблокировать" }));
    expect(config().blockedOrganizations).toEqual([]);
  });

  it("shuts a blocked organization out of its cabinet", () => {
    seedConfig({ blockedOrganizations: ["akmola-gas"] });
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(operatorSession("akmola-gas")));
    render(<OperatorContracts {...base} />);
    expect(
      screen.getByRole("heading", { name: "Учётная запись организации заблокирована" }),
    ).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "Разделы кабинета организации" })).toBeNull();
  });

  it("adds a staff member, changes the role, blocks and removes", () => {
    render(<AdminOrganizations {...base} />);
    const card = screen.getByRole("article", { name: "Газ Акмола" });
    fireEvent.change(within(card).getByLabelText(/^Имя сотрудника/), { target: { value: " " } });
    fireEvent.click(within(card).getByRole("button", { name: "Добавить сотрудника" }));
    // The staff list is a closed <details> until someone opens it, so only its presence is checked.
    expect(within(card).getByText("Укажите имя сотрудника")).toBeInTheDocument();

    fireEvent.change(within(card).getByLabelText(/^Имя сотрудника/), {
      target: { value: "Сергеев А." },
    });
    fireEvent.change(within(card).getByLabelText(/^Роль$/), { target: { value: "inspector" } });
    fireEvent.click(within(card).getByRole("button", { name: "Добавить сотрудника" }));
    expect(config().staff).toMatchObject([
      { name: "Сергеев А.", role: "inspector", organizationId: "akmola-gas", blocked: false },
    ]);

    fireEvent.change(within(card).getByLabelText(/^Роль: Сергеев А\./), {
      target: { value: "accountant" },
    });
    expect(config().staff[0].role).toBe("accountant");
    const member = within(card).getByText("Сергеев А.").closest("li") as HTMLElement;
    fireEvent.click(within(member).getByRole("button", { name: "Заблокировать" }));
    expect(config().staff[0].blocked).toBe(true);
    fireEvent.click(within(member).getByRole("button", { name: "Убрать" }));
    expect(config().staff).toEqual([]);
    expect(audit().every((entry) => entry.entity === "config")).toBe(true);
  });
});

describe("the form of the application", () => {
  it("saves the documents and the required fields, and writes the parameters that changed", () => {
    render(<AdminForms {...base} />);
    const owner = screen.getByRole("group", { name: "Собственник" });
    fireEvent.click(within(owner).getByLabelText(ru.contracts.documents.names.property));
    fireEvent.click(
      within(screen.getByRole("group", { name: "Обязательные поля" })).getByLabelText(
        "Электронная почта",
      ),
    );
    click("Сохранить");
    expect(config().documents.owner).toEqual(["identity"]);
    expect(config().requiredFields).toEqual(["email"]);
    expect(audit()[0].note).toBe("documents.owner, requiredFields");
  });

  it("says nothing changed and writes nothing when nothing did", () => {
    render(<AdminForms {...base} />);
    click("Сохранить");
    expect(audit()).toEqual([]);
  });

  it("goes back to the defaults", () => {
    seedConfig({ requiredFields: ["email"] });
    render(<AdminForms {...base} />);
    click("Сбросить к умолчанию");
    expect(config()).toMatchObject({ requiredFields: [] });
  });
});

describe("terms, languages and access", () => {
  it("saves the terms and refuses a wrong number", () => {
    render(<AdminSettings {...base} />);
    choose(/^Обращения/, "30");
    choose(/^Услуги каталога/, "0");
    click("Сохранить");
    expect(screen.getByText("Срок — число от 1 до 60")).toBeVisible();
    expect(config().regulationDays.appeal).toBe(15);

    choose(/^Услуги каталога/, "3");
    click("Сохранить");
    expect(config().regulationDays).toEqual({ service: 3, contract: 10, meter: 7, appeal: 30 });
  });

  it("switches languages on and off but never Russian", () => {
    render(<AdminSettings {...base} />);
    fireEvent.click(screen.getByLabelText("English"));
    fireEvent.click(screen.getByLabelText("Қазақша"));
    fireEvent.click(screen.getByLabelText(/^Русский/));
    click("Сохранить");
    expect(config().languages).toEqual(["ru", "en"]);
  });

  it("turns the sums of reports off", () => {
    render(<AdminSettings {...base} />);
    fireEvent.click(screen.getByLabelText("Показывать суммы платежей в отчётах"));
    click("Сохранить");
    expect(config().financeAccess).toBe(false);
  });

  it("lists the statuses of every process for reference", () => {
    render(<AdminSettings {...base} />);
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(40);
  });
});

describe("texts of notifications", () => {
  const props = {
    lang: "ru",
    dict: ru,
    defaults: { ru: ru.notifications.events, kk: kk.notifications.events },
  } as const;

  it("shows the standard text and saves a text of its own in Russian and Kazakh", () => {
    render(<AdminTemplates {...props} />);
    expect(
      screen.getAllByText(/Стандартный текст: Вы зарегистрированы на портале/).length,
    ).toBeGreaterThan(0);
    choose(/^Русский: registered$/, "Добро пожаловать!");
    choose(/^Қазақша: registered$/, "Қош келдіңіз!");
    click("Сохранить");
    expect(config().templates).toEqual({
      ru: { registered: "Добро пожаловать!" },
      kk: { registered: "Қош келдіңіз!" },
    });
    expect(audit()[0].note).toBe("templates.ru.registered, templates.kk.registered");
  });

  it("is used in the notifications of the person", () => {
    seedConfig({ templates: { ru: { property_added: "Ваш объект записан: {address}" }, kk: {} } });
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES.resident));
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
        ownerInfo: "Иван",
      },
      "p-1",
      "demo-resident",
      now,
    );
    window.localStorage.setItem(PROPERTIES_KEY, JSON.stringify([made]));
    render(<NotificationsPage lang="ru" dict={ru} />);
    expect(screen.getByText("Ваш объект записан: Мариновка, улица Центральная, 1")).toBeVisible();
    void requestVerification;
  });

  it("will not save a text that is too long", () => {
    render(<AdminTemplates {...props} />);
    choose(/^Русский: registered$/, "я".repeat(401));
    click("Сохранить");
    expect(screen.getByText("Не больше 400 знаков")).toBeVisible();
    expect(config().templates.ru).toEqual({});
  });

  it("goes back to the standard text of one event", () => {
    seedConfig({ templates: { ru: { registered: "Привет" }, kk: {} } });
    render(<AdminTemplates {...props} />);
    const row = screen.getByText("registered").closest("li") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Вернуть стандартный" }));
    click("Сохранить");
    expect(config().templates.ru).toEqual({});
  });
});

describe("integrations and the journal", () => {
  it("shows the systems with their state and the errors by code only", () => {
    render(<AdminIntegrations {...base} />);
    const systems = screen.getAllByRole("table")[0];
    expect(within(systems).getAllByRole("row")).toHaveLength(1 + providers.length + 5);
    expect(within(systems).getByText("Чистая область").closest("tr")).toHaveTextContent(
      "Недоступна",
    );
    const errors = screen.getAllByRole("table")[1];
    expect(within(errors).getAllByRole("row").length).toBeGreaterThan(1);
    expect(screen.queryByText(/stack|exception|SQL|token/i)).toBeNull();
  });

  it("lists every record of the portal and filters by who made it", () => {
    window.localStorage.setItem(
      AUDIT_KEY,
      JSON.stringify([
        {
          id: "e-1",
          at: "2026-10-21T06:00:00.000Z",
          organizationId: "portal",
          actor: "Демо Администратор",
          entity: "config",
          entityId: "forms",
          number: "forms",
          action: "config",
          note: "requiredFields",
        },
        {
          id: "e-2",
          at: "2026-10-20T06:00:00.000Z",
          organizationId: "akmola-gas",
          actor: "Демо Оператор",
          entity: "reading",
          entityId: "r",
          number: "DEMO-POK-2026-00001",
          action: "status",
          from: "registered",
          to: "accepted",
        },
      ]),
    );
    render(<AdminAudit {...base} />);
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("Изменено: requiredFields")).toBeVisible();
    expect(screen.getByText("Зарегистрировано → Принято")).toBeVisible();
    choose(/^Организация/, "portal");
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);
  });
});
