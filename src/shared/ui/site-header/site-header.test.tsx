import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { SiteHeader } from "./site-header";

const usePathname = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

function renderHeader() {
  return render(<SiteHeader lang="ru" dict={ru} />);
}

describe("SiteHeader", () => {
  beforeEach(() => usePathname.mockReturnValue("/ru/services"));

  it("links the brand to the home page of the current language", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: /Aqmola/ })).toHaveAttribute("href", "/ru");
  });

  it("shows the main navigation with localized links", () => {
    renderHeader();
    const nav = screen.getByRole("navigation", { name: "Основная навигация" });
    expect(within(nav).getByRole("link", { name: "Услуги" })).toHaveAttribute(
      "href",
      "/ru/services",
    );
    expect(within(nav).getByRole("link", { name: "Мои заявки" })).toHaveAttribute(
      "href",
      "/ru/applications",
    );
    expect(within(nav).getAllByRole("link")).toHaveLength(5);
  });

  it("marks the current section, including nested pages", () => {
    usePathname.mockReturnValue("/ru/services/water-meter-readings");
    renderHeader();
    expect(screen.getByRole("link", { name: "Услуги" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Главная" })).not.toHaveAttribute("aria-current");
  });

  it("lets the home page header sit over the hero photo", () => {
    usePathname.mockReturnValue("/ru");
    const { container } = renderHeader();
    expect(container.querySelector("header")).toHaveAttribute("data-overlay", "true");
    expect(screen.getByRole("link", { name: "Главная" })).toHaveAttribute("aria-current", "page");
  });

  it("uses a solid header on inner pages", () => {
    const { container } = renderHeader();
    expect(container.querySelector("header")).toHaveAttribute("data-overlay", "false");
  });

  it("contains the language switcher and a sign in link", () => {
    renderHeader();
    expect(screen.getByRole("group", { name: "Язык" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute("href", "/ru/sign-in");
  });

  describe("mobile menu", () => {
    it("is closed at first and opens with the button", () => {
      renderHeader();
      const button = screen.getByRole("button", { name: "Открыть меню" });
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(button).toHaveAttribute("aria-controls", "site-nav");

      fireEvent.click(button);

      expect(screen.getByRole("button", { name: "Закрыть меню" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      expect(screen.getByRole("navigation")).toHaveAttribute("data-open", "true");
    });

    it("closes with Escape and returns focus to the button", () => {
      renderHeader();
      fireEvent.click(screen.getByRole("button", { name: "Открыть меню" }));

      fireEvent.keyDown(screen.getByRole("navigation"), { key: "Escape" });

      const button = screen.getByRole("button", { name: "Открыть меню" });
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(button).toHaveFocus();
    });

    it("closes after navigating to another page", () => {
      const { rerender } = renderHeader();
      fireEvent.click(screen.getByRole("button", { name: "Открыть меню" }));
      expect(screen.getByRole("navigation")).toHaveAttribute("data-open", "true");

      usePathname.mockReturnValue("/ru/news");
      rerender(<SiteHeader lang="ru" dict={ru} />);

      expect(screen.getByRole("navigation")).toHaveAttribute("data-open", "false");
    });
  });
});
