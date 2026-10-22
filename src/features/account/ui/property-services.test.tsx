import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import type { ProviderInfo } from "../domain/availability";
import { createProperty, requestVerification, type Property } from "../domain/property";
import { PropertyServices } from "./property-services";

const providers: ProviderInfo[] = [
  { id: "akmola-water", name: "Водоканал Акмолы", sector: "water", territories: "all" },
  { id: "akmola-heat", name: "Теплосети Акмолы", sector: "heat", territories: "all" },
  { id: "akmola-gas", name: "Газ Акмола", sector: "gas", territories: "all" },
  { id: "akmola-grid", name: "Электросети Акмолы", sector: "electricity", territories: "all" },
  { id: "region-eco", name: "Чистая область", sector: "waste", territories: ["atbasar"] },
];

function property(patch: { addressId?: string } = {}, confirmed = false): Property {
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
      ...patch,
    },
    "p-1",
    "u-1",
    new Date("2026-10-21T06:00:00Z"),
  );
  if (!confirmed) return made;
  const result = requestVerification(made, { method: "state_integration" }, new Date());
  if (!result.ok) throw new Error("setup failed");
  return result.property;
}

const renderServices = (item: Property, missing = {}) =>
  render(
    <PropertyServices
      lang="ru"
      property={item}
      providers={providers}
      missing={missing}
      labels={ru.properties.detail.services}
    />,
  );

const row = (title: string) =>
  screen.getByRole("heading", { level: 3, name: title }).closest("li") as HTMLElement;

describe("PropertyServices", () => {
  it("lists the providers of every utility the address has", () => {
    renderServices(property());
    expect(
      within(row("Водоснабжение и водоотведение")).getByText("Водоканал Акмолы"),
    ).toBeVisible();
    expect(within(row("Вывоз твёрдых бытовых отходов")).getByText("Чистая область")).toBeVisible();
  });

  it("shows the providers but no way to order until the object is confirmed", () => {
    renderServices(property());
    expect(screen.getByText(/Подтвердите объект/)).toBeVisible();
    expect(screen.queryByRole("link", { name: /Услуги поставщика/ })).not.toBeInTheDocument();
  });

  it("links a confirmed object to the services of each provider in its district", () => {
    renderServices(property({}, true));
    expect(screen.queryByText(/Подтвердите объект/)).not.toBeInTheDocument();
    const link = within(row("Водоснабжение и водоотведение")).getByRole("link", {
      name: /Услуги поставщика/,
    });
    expect(link).toHaveAttribute(
      "href",
      "/ru/services?organization=akmola-water&territory=atbasar",
    );
  });

  it("offers to make a contract with each provider of a confirmed object", () => {
    renderServices(property({}, true));
    const link = within(row("Водоснабжение и водоотведение")).getByRole("link", {
      name: /Оформить договор/,
    });
    expect(link).toHaveAttribute(
      "href",
      "/ru/contracts/new?property=p-1&service=water-contract-resident&provider=akmola-water",
    );
  });

  it("refuses a utility the village has no network for and offers no way to order it", () => {
    renderServices(property({ addressId: "atbasar-marinovka" }, true), {
      "atbasar-marinovka": ["gas", "heat"],
    });
    for (const title of ["Газоснабжение", "Теплоснабжение"]) {
      const item = row(title);
      expect(within(item).getByText(/Не предоставляется/)).toBeVisible();
      expect(within(item).getByText(/Договор оформить нельзя/)).toBeVisible();
      expect(within(item).queryByRole("link")).not.toBeInTheDocument();
    }
    expect(within(row("Электроснабжение")).getAllByRole("link")).toHaveLength(2);
  });

  it("says when the area has no provider at all", () => {
    render(
      <PropertyServices
        lang="ru"
        property={property()}
        providers={[]}
        missing={{}}
        labels={ru.properties.detail.services}
      />,
    );
    expect(
      within(row("Газоснабжение")).getByText(
        "Поставщика по этому адресу пока нет. Договор оформить нельзя.",
      ),
    ).toBeVisible();
  });

  it("reminds that a contract of the previous owner does not pass on", () => {
    renderServices(property());
    expect(screen.getByText(/Договор прежнего владельца не переходит/)).toBeVisible();
  });
});
