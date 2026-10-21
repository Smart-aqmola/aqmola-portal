import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AddressSuggestion } from "../domain/address-search";
import { AddressSearch } from "./address-search";

const suggestions: AddressSuggestion[] = [
  {
    id: "kokshetau-abay",
    territoryId: "kokshetau",
    locality: "Кокшетау",
    street: "улица Абая",
    label: "Кокшетау, улица Абая",
    without: [],
  },
  {
    id: "zerendi-abay",
    territoryId: "zerendi",
    locality: "Зеренда",
    street: "улица Абая",
    label: "Зерендинский район, Зеренда, улица Абая",
    without: [],
  },
  {
    id: "akkol-novorybinka",
    territoryId: "akkol",
    locality: "Новорыбинка",
    street: "улица Школьная",
    label: "Аккольский район, Новорыбинка, улица Школьная",
    without: ["gas"],
  },
];

const labels = {
  search: "Поиск адреса",
  searchHint: "Начните вводить улицу",
  searchCount: "Найдено вариантов: {count}",
  searchNone: "Ничего не найдено.",
};

function setup() {
  const onSelect = vi.fn();
  render(<AddressSearch suggestions={suggestions} labels={labels} onSelect={onSelect} />);
  const input = screen.getByRole("combobox", { name: "Поиск адреса" });
  return { input, onSelect };
}

describe("AddressSearch", () => {
  it("shows nothing until the person types, then lists the variants and counts them", () => {
    const { input } = setup();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "false");

    fireEvent.change(input, { target: { value: "абая" } });
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Найдено вариантов: 2")).toBeInTheDocument();
  });

  it("picks a variant with the keyboard: arrows move, Enter chooses", () => {
    const { input, onSelect } = setup();
    fireEvent.change(input, { target: { value: "абая" } });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", options[1].id);

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(suggestions[1]);
    expect(input).toHaveValue("Зерендинский район, Зеренда, улица Абая");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("wraps around at both ends of the list", () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: "абая" } });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
  });

  it("picks a variant with a click", () => {
    const { input, onSelect } = setup();
    fireEvent.change(input, { target: { value: "школьная" } });
    fireEvent.click(screen.getByRole("option", { name: /Новорыбинка/ }));
    expect(onSelect).toHaveBeenCalledWith(suggestions[2]);
  });

  it("closes the list with Escape without choosing", () => {
    const { input, onSelect } = setup();
    fireEvent.change(input, { target: { value: "абая" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("says plainly when nothing is found", () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: "марсианская" } });
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getAllByText("Ничего не найдено.").length).toBeGreaterThan(0);
  });
});
