import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderInfo } from "@/features/account/domain/availability";
import {
  createProperty,
  requestVerification,
  type Property,
} from "@/features/account/domain/property";
import { PROPERTIES_KEY } from "@/features/account/domain/storage";
import { DEMO_PROFILES, SESSION_KEY } from "@/features/applications/domain/storage";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { CONTRACTS_KEY, parseContracts } from "../domain/storage";
import { ContractNew, type ContractNewProps } from "./contract-new";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

const providers: ProviderInfo[] = [
  { id: "akmola-water", name: "Водоканал Акмолы", sector: "water", territories: "all" },
  { id: "akmola-heat", name: "Теплосети Акмолы", sector: "heat", territories: "all" },
  { id: "akmola-gas", name: "Газ Акмола", sector: "gas", territories: "all" },
  { id: "akmola-grid", name: "Электросети Акмолы", sector: "electricity", territories: "all" },
  {
    id: "akmola-energy-sales",
    name: "Энергосбыт Акмолы",
    sector: "electricity",
    territories: "all",
  },
  { id: "region-eco", name: "Чистая область", sector: "waste", territories: ["atbasar"] },
];
const territories = [{ id: "atbasar", name: "Атбасарский район" }];

function property(id: string, confirmed: boolean, addressId?: string): Property {
  const made = createProperty(
    {
      territoryId: "atbasar",
      locality: "Мариновка",
      street: "улица Центральная",
      house: id === "p-1" ? "1" : "2",
      flat: "",
      type: "house",
      relation: "owner",
      personalAccount: "",
      ownerInfo: "Демо Житель",
      ...(addressId ? { addressId } : {}),
    },
    id,
    "demo-resident",
    new Date("2026-10-21T06:00:00Z"),
  );
  if (!confirmed) return made;
  const result = requestVerification(made, { method: "state_integration" }, new Date());
  if (!result.ok) throw new Error("setup failed");
  return result.property;
}

function renderNew(overrides: Partial<ContractNewProps> = {}) {
  return render(
    <ContractNew
      lang="ru"
      dict={ru}
      providers={providers}
      missing={{ "atbasar-marinovka": ["gas", "heat"] }}
      territories={territories}
      preset={{}}
      {...overrides}
    />,
  );
}

const signIn = () =>
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES.resident));
const seed = (...items: Property[]) =>
  window.localStorage.setItem(PROPERTIES_KEY, JSON.stringify(items));
const options = (select: HTMLElement) =>
  Array.from(select.querySelectorAll("option")).map((option) => ({
    text: option.textContent,
    disabled: option.disabled,
    value: option.getAttribute("value"),
  }));

describe("ContractNew", () => {
  beforeEach(() => {
    window.localStorage.clear();
    replace.mockClear();
  });

  it("asks a guest to sign in and brings them back", () => {
    renderNew();
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute(
      "href",
      "/ru/sign-in?next=%2Fru%2Fcontracts%2Fnew",
    );
  });

  it("sends someone without a confirmed object to add one", () => {
    signIn();
    seed(property("p-1", false));
    renderNew();
    expect(screen.getByRole("heading", { name: "Нет подтверждённых объектов" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Добавить объект" })).toHaveAttribute(
      "href",
      "/ru/properties/new",
    );
  });

  it("lists a utility the address does not have, but does not let it be chosen", () => {
    signIn();
    seed(property("p-1", true, "atbasar-marinovka"));
    renderNew();
    // A single confirmed object is chosen at once.
    expect(screen.getByLabelText(/^Объект недвижимости/)).toHaveValue("p-1");
    const service = screen.getByLabelText(/^Коммунальная услуга/);
    expect(service).not.toBeDisabled();
    const gas = options(service).find((option) => option.value === "gas");
    expect(gas).toMatchObject({
      disabled: true,
      text: "Газоснабжение (недоступно по этому адресу)",
    });
    expect(options(service).find((option) => option.value === "water")?.disabled).toBe(false);
    // Waste has a provider only for the district, which this object belongs to.
    expect(options(service).find((option) => option.value === "waste")?.disabled).toBe(false);
  });

  it("offers every provider of the chosen utility and keeps a single one chosen", () => {
    signIn();
    seed(property("p-1", true));
    renderNew();
    fireEvent.change(screen.getByLabelText(/^Коммунальная услуга/), {
      target: { value: "electricity" },
    });
    const provider = screen.getByLabelText(/^Поставщик/);
    expect(options(provider).map((option) => option.text)).toEqual([
      "Выберите поставщика",
      "Электросети Акмолы",
      "Энергосбыт Акмолы",
    ]);
    fireEvent.change(screen.getByLabelText(/^Коммунальная услуга/), { target: { value: "water" } });
    expect(screen.getByLabelText(/^Поставщик/)).toHaveValue("akmola-water");
  });

  it("names what is missing before going on", () => {
    signIn();
    seed(property("p-1", true), property("p-2", true));
    renderNew();
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(1);
    expect(parseContracts(window.localStorage.getItem(CONTRACTS_KEY))).toEqual([]);
    expect(replace).not.toHaveBeenCalled();
  });

  it("creates a draft filled from the object and the profile and opens it", () => {
    signIn();
    seed(property("p-1", true));
    renderNew();
    fireEvent.change(screen.getByLabelText(/^Коммунальная услуга/), { target: { value: "water" } });
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));

    const [draft] = parseContracts(window.localStorage.getItem(CONTRACTS_KEY));
    expect(draft).toMatchObject({
      status: "draft",
      ownerId: "demo-resident",
      propertyId: "p-1",
      sector: "water",
      serviceSlug: "water-contract-resident",
      serviceTitle: "Заключение договора на водоснабжение и водоотведение",
      providerId: "akmola-water",
      providerName: "Водоканал Акмолы",
      address: "Атбасарский район, Мариновка, улица Центральная, 1",
      propertyType: "house",
      basis: "owner",
    });
    // The shared demo profile knows only a name; the rest the person fills in.
    expect(draft.applicant).toMatchObject({ lastName: "Демо", firstName: "Житель", iin: "" });
    expect(replace).toHaveBeenCalledWith(`/ru/contracts/${draft.id}`);
  });

  it("starts from the service of the catalog: the utility and the provider are chosen", () => {
    signIn();
    seed(property("p-1", true));
    renderNew({ preset: { service: "heat-contract" } });
    expect(screen.getByLabelText(/^Коммунальная услуга/)).toHaveValue("heat");
    expect(screen.getByLabelText(/^Поставщик/)).toHaveValue("akmola-heat");
  });

  it("keeps the provider the person picked next to the object, not the default one", () => {
    signIn();
    seed(property("p-1", true));
    renderNew({ preset: { service: "electricity-contract-resident", provider: "akmola-grid" } });
    expect(screen.getByLabelText(/^Поставщик/)).toHaveValue("akmola-grid");
  });

  it("starts from the object it was opened for", () => {
    signIn();
    seed(property("p-1", true), property("p-2", true));
    renderNew({ preset: { property: "p-2" } });
    expect(screen.getByLabelText(/^Объект недвижимости/)).toHaveValue("p-2");
  });
});
