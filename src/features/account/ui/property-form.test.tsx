import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_PROFILES } from "@/features/applications/domain/storage";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { ToastProvider } from "@/shared/ui/toast/toast-provider";
import type { AddressSuggestion } from "../domain/address-search";
import { PROPERTIES_KEY, parseProperties } from "../domain/storage";
import { PropertyForm } from "./property-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const territories = [
  { id: "kokshetau", name: "Кокшетау" },
  { id: "akkol", name: "Аккольский район" },
];
const suggestions: AddressSuggestion[] = [
  {
    id: "kokshetau-abay",
    territoryId: "kokshetau",
    locality: "Кокшетау",
    street: "улица Абая",
    label: "Кокшетау, улица Абая",
    without: [],
  },
];

function renderForm() {
  return render(
    <ToastProvider>
      <PropertyForm
        lang="ru"
        session={DEMO_PROFILES.resident}
        labels={ru.properties}
        territories={territories}
        suggestions={suggestions}
      />
    </ToastProvider>,
  );
}

const field = (name: RegExp | string) => screen.getByLabelText(name);
const saved = () => parseProperties(window.localStorage.getItem(PROPERTIES_KEY));

function fillRest() {
  fireEvent.change(field(/^Дом/), { target: { value: "10" } });
  fireEvent.change(field(/^Квартира/), { target: { value: "5" } });
  fireEvent.change(field(/^Тип объекта/), { target: { value: "apartment" } });
  fireEvent.change(field(/^Ваша роль/), { target: { value: "owner" } });
}

describe("PropertyForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
    push.mockClear();
  });

  it("does not save an empty form and puts the focus on the first field to fix", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Сохранить объект" }));
    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(6);
    expect(field(/^Город или район/)).toHaveFocus();
    expect(saved()).toEqual([]);
  });

  it("fills the place from a variant of the directory and saves the object", () => {
    renderForm();
    fireEvent.change(screen.getByRole("combobox", { name: "Поиск адреса" }), {
      target: { value: "абая" },
    });
    fireEvent.click(screen.getByRole("option", { name: "Кокшетау, улица Абая" }));

    expect(field(/^Город или район/)).toHaveValue("kokshetau");
    expect(field(/^Населённый пункт/)).toHaveValue("Кокшетау");
    expect(field(/^Улица/)).toHaveValue("улица Абая");

    fillRest();
    fireEvent.click(screen.getByRole("button", { name: "Сохранить объект" }));

    const [property] = saved();
    expect(property).toMatchObject({
      ownerId: "demo-resident",
      territoryId: "kokshetau",
      street: "улица Абая",
      house: "10",
      flat: "5",
      type: "apartment",
      relation: "owner",
      addressId: "kokshetau-abay",
      verification: { status: "unverified" },
    });
    expect(push).toHaveBeenCalledWith(`/ru/properties/${property.id}`);
    expect(screen.getByText(/Объект добавлен/)).toBeVisible();
  });

  it("accepts an address typed by hand and then forgets the directory entry", () => {
    renderForm();
    fireEvent.change(screen.getByRole("combobox", { name: "Поиск адреса" }), {
      target: { value: "абая" },
    });
    fireEvent.click(screen.getByRole("option", { name: "Кокшетау, улица Абая" }));
    fireEvent.change(field(/^Улица/), { target: { value: "улица Новая" } });
    fillRest();
    fireEvent.click(screen.getByRole("button", { name: "Сохранить объект" }));

    const [property] = saved();
    expect(property.street).toBe("улица Новая");
    expect(property).not.toHaveProperty("addressId");
  });

  it("fills the owner with the person's own name when they are the owner", () => {
    renderForm();
    fireEvent.change(field(/^Ваша роль/), { target: { value: "owner" } });
    expect(field(/^Собственник или законный/)).toHaveValue("Демо Житель");

    fireEvent.change(field(/^Собственник или законный/), { target: { value: "ТОО Дом" } });
    fireEvent.change(field(/^Ваша роль/), { target: { value: "tenant" } });
    expect(field(/^Собственник или законный/)).toHaveValue("ТОО Дом");
  });

  it("needs a flat only for an apartment", () => {
    renderForm();
    fireEvent.change(field(/^Тип объекта/), { target: { value: "house" } });
    expect(field(/^Квартира или помещение/)).not.toBeRequired();
    fireEvent.change(field(/^Тип объекта/), { target: { value: "apartment" } });
    expect(field(/^Квартира или помещение/)).toBeRequired();
  });

  it("names a wrong house number and a wrong personal account", () => {
    renderForm();
    fireEvent.change(field(/^Дом/), { target: { value: "!!" } });
    fireEvent.change(field(/^Лицевой счёт/), { target: { value: "12ab" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить объект" }));
    expect(screen.getByText("Допустимы буквы, цифры, пробел, дробь и дефис")).toBeVisible();
    expect(screen.getByText("От 6 до 12 цифр", { selector: "p[role='alert']" })).toBeVisible();
  });
});
