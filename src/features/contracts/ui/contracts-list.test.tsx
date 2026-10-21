import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEMO_PROFILES,
  SESSION_KEY,
  operatorSession,
} from "@/features/applications/domain/storage";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { createDraft, type ContractApplication } from "../domain/contract";
import { CONTRACTS_KEY } from "../domain/storage";
import { ContractsList } from "./contracts-list";

function make(
  id: string,
  patch: Partial<ContractApplication> & { propertyId?: string; address?: string } = {},
): ContractApplication {
  return {
    ...createDraft(
      {
        propertyId: patch.propertyId ?? "p-1",
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
        address: patch.address ?? "Кокшетау, улица Абая, 10",
        propertyType: "house",
        basis: "owner",
        personalAccount: "12345678",
      },
      id,
      "demo-resident",
      new Date("2026-10-21T06:00:00Z"),
    ),
    ...patch,
  };
}

const seed = (...items: ContractApplication[]) =>
  window.localStorage.setItem(CONTRACTS_KEY, JSON.stringify(items));
const renderList = () => render(<ContractsList lang="ru" dict={ru} />);

describe("ContractsList", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES.resident));
  });

  it("asks a guest to sign in and brings them back", () => {
    window.localStorage.removeItem(SESSION_KEY);
    renderList();
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute(
      "href",
      "/ru/sign-in?next=%2Fru%2Fcontracts",
    );
  });

  it("tells an operator this is not their page", () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(operatorSession("akmola-water")));
    renderList();
    expect(screen.getByText("Кабинет оператора не показывает договоры жителей.")).toBeVisible();
  });

  it("invites a resident without contracts to make the first one", () => {
    renderList();
    expect(screen.getByRole("heading", { name: "Договоров пока нет" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Оформить договор" })).toHaveAttribute(
      "href",
      "/ru/contracts/new",
    );
  });

  it("shows for each contract the fields of the specification", () => {
    seed(
      make("c-1", {
        status: "active",
        number: "DEMO-DOG-2026-00001",
        submittedAt: "2026-10-21T06:05:00.000Z",
        startsAt: "2026-10-25T08:00:00.000Z",
        meter: { has: true, serial: "SN-77", reading: "10" },
        signatures: {
          contractApplicant: { name: "a", at: "2026-10-22T07:00:00.000Z", method: "demo_ecp" },
          contractProvider: { name: "b", at: "2026-10-23T09:00:00.000Z", method: "demo_ecp" },
        },
      }),
    );
    renderList();
    const card = screen.getByRole("article");
    for (const expected of [
      "Заключение договора на водоснабжение",
      "Водоканал Акмолы",
      "DEMO-DOG-2026-00001",
      "21 октября 2026",
      "23 октября 2026",
      "25 октября 2026",
      "12345678",
      "Кокшетау, улица Абая, 10",
      "SN-77",
      "Нет данных от поставщика",
      "Договор действует",
    ]) {
      expect(within(card).getAllByText(expected).length, expected).toBeGreaterThan(0);
    }
    expect(within(card).getByRole("link", { name: /Открыть/ })).toHaveAttribute(
      "href",
      "/ru/contracts/c-1",
    );
  });

  it("writes a dash for what does not exist yet", () => {
    seed(make("c-1", { status: "registered", number: "DEMO-DOG-2026-00001" }));
    renderList();
    const card = screen.getByRole("article");
    expect(within(card).getByText("Дата подписания").nextElementSibling).toHaveTextContent("—");
    expect(within(card).getByText("Дата начала действия").nextElementSibling).toHaveTextContent(
      "—",
    );
    expect(within(card).getByText("Приборы учёта").nextElementSibling).toHaveTextContent(
      "Нет сведений",
    );
  });

  it("groups the contracts by object", () => {
    seed(
      make("c-1", { propertyId: "p-1", address: "Кокшетау, улица Абая, 10" }),
      make("c-2", { propertyId: "p-2", address: "Акколь, улица Ауэзова, 3" }),
      make("c-3", { propertyId: "p-1", address: "Кокшетау, улица Абая, 10" }),
    );
    renderList();
    const sections = screen.getAllByRole("region");
    expect(sections).toHaveLength(2);
    const first = sections.find((section) =>
      within(section).queryByRole("heading", { name: /улица Абая/ }),
    )!;
    expect(within(first).getAllByRole("article")).toHaveLength(2);
  });

  it("offers the right action for a draft and for a returned application", () => {
    seed(
      make("c-1", { status: "draft" }),
      make("c-2", { status: "returned_for_revision", number: "DEMO-DOG-2026-00002" }),
    );
    renderList();
    expect(screen.getByRole("link", { name: /Продолжить оформление/ })).toHaveAttribute(
      "href",
      "/ru/contracts/c-1",
    );
    expect(screen.getByRole("link", { name: /Исправить замечания/ })).toHaveAttribute(
      "href",
      "/ru/contracts/c-2",
    );
  });

  it("filters by status and offers only the statuses that exist", () => {
    seed(
      make("c-1", { status: "draft" }),
      make("c-2", { status: "active", number: "DEMO-DOG-2026-00002" }),
    );
    renderList();
    const filter = screen.getByLabelText("Показать");
    const options = Array.from(filter.querySelectorAll("option")).map((o) => o.textContent);
    expect(options).toEqual(["Все статусы", "Черновик", "Договор действует"]);

    fireEvent.change(filter, { target: { value: "active" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Найдено: 1")).toBeVisible();
  });

  it("does not show the contracts of someone else", () => {
    seed({ ...make("c-1"), ownerId: "someone-else" });
    renderList();
    expect(screen.getByRole("heading", { name: "Договоров пока нет" })).toBeVisible();
  });
});
