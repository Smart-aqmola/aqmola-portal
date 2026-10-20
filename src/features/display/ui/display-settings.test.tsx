import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { DISPLAY_KEY } from "../domain/settings";
import { DisplaySettings } from "./display-settings";

const open = () => fireEvent.click(screen.getByRole("button", { name: "Настройки вида" }));

describe("DisplaySettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
    for (const name of ["data-theme", "data-contrast", "data-text"]) {
      document.documentElement.removeAttribute(name);
    }
  });

  it("is closed at first and opens a panel with the options", () => {
    render(<DisplaySettings labels={ru.display} />);
    expect(screen.queryByRole("group", { name: "Вид сайта" })).toBeNull();
    open();
    expect(screen.getByRole("group", { name: "Вид сайта" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "Как в системе" })).toBeChecked();
  });

  it("applies and saves the chosen theme, contrast and text size", () => {
    render(<DisplaySettings labels={ru.display} />);
    open();
    fireEvent.click(screen.getByRole("radio", { name: "Тёмная" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Высокий контраст" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Крупный шрифт" }));

    const root = document.documentElement;
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(root.getAttribute("data-contrast")).toBe("high");
    expect(root.getAttribute("data-text")).toBe("large");
    expect(JSON.parse(window.localStorage.getItem(DISPLAY_KEY) ?? "{}")).toEqual({
      theme: "dark",
      contrast: true,
      large: true,
    });
  });

  it("resets everything", () => {
    render(<DisplaySettings labels={ru.display} />);
    open();
    fireEvent.click(screen.getByRole("radio", { name: "Тёмная" }));
    fireEvent.click(screen.getByRole("button", { name: "Сбросить настройки" }));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(window.localStorage.getItem(DISPLAY_KEY)).toBeNull();
  });

  it("closes on Escape and gives the focus back to the button", () => {
    render(<DisplaySettings labels={ru.display} />);
    open();
    fireEvent.keyDown(screen.getByRole("group", { name: "Вид сайта" }), { key: "Escape" });
    expect(screen.queryByRole("group", { name: "Вид сайта" })).toBeNull();
    expect(screen.getByRole("button", { name: "Настройки вида" })).toHaveFocus();
  });
});
