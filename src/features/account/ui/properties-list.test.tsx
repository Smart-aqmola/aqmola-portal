import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEMO_PROFILES,
  SESSION_KEY,
  operatorSession,
} from "@/features/applications/domain/storage";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { createProperty } from "../domain/property";
import { PROPERTIES_KEY } from "../domain/storage";
import { PropertiesList } from "./properties-list";

const territories = [{ id: "kokshetau", name: "Кокшетау" }];

const make = (id: string, ownerId: string, street: string) =>
  createProperty(
    {
      territoryId: "kokshetau",
      locality: "Кокшетау",
      street,
      house: "1",
      flat: "",
      type: "house",
      relation: "owner",
      personalAccount: "",
      ownerInfo: "Демо Житель",
    },
    id,
    ownerId,
    new Date("2026-10-21T06:00:00Z"),
  );

const renderList = () =>
  render(<PropertiesList lang="ru" labels={ru.properties} territories={territories} />);

describe("PropertiesList", () => {
  beforeEach(() => window.localStorage.clear());

  it("asks a guest to sign in", () => {
    renderList();
    expect(screen.getByRole("heading", { name: "Войдите, чтобы увидеть объекты" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute(
      "href",
      "/ru/sign-in?next=%2Fru%2Fproperties",
    );
  });

  it("tells an operator this is not their page", () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(operatorSession("akmola-water")));
    renderList();
    expect(screen.getByText("Кабинет оператора не работает с объектами жителей.")).toBeVisible();
  });

  it("invites a resident without objects to add the first one", () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES.resident));
    renderList();
    expect(screen.getByRole("heading", { name: "Объектов пока нет" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Добавить объект" })).toHaveAttribute(
      "href",
      "/ru/properties/new",
    );
  });

  it("lists only the objects of the signed-in person, each with a written status", () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES.resident));
    window.localStorage.setItem(
      PROPERTIES_KEY,
      JSON.stringify([
        make("p-1", "demo-resident", "улица Абая"),
        make("p-2", "someone-else", "улица Чужая"),
      ]),
    );
    renderList();
    const items = screen.getAllByRole("article");
    expect(items).toHaveLength(1);
    expect(
      within(items[0]).getByRole("heading", { level: 3, name: "Кокшетау, улица Абая, 1" }),
    ).toBeVisible();
    expect(within(items[0]).getByText("Не подтверждён")).toBeVisible();
    expect(within(items[0]).getByRole("link", { name: /Открыть/ })).toHaveAttribute(
      "href",
      "/ru/properties/p-1",
    );
    expect(screen.queryByText(/Чужая/)).not.toBeInTheDocument();
  });
});
