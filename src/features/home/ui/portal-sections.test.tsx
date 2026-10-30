import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { portalSections } from "../domain/home-content";
import { PortalSections } from "./portal-sections";

describe("PortalSections", () => {
  it("shows eight sections, two even rows of four; my applications stay in the main menu", () => {
    render(<PortalSections lang="ru" labels={ru.home.portal} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    expect(screen.queryByText("Мои заявки")).toBeNull();
    for (const name of [
      "Заключение договоров",
      "Счётчики",
      "Начисления и оплата",
      "Мои договоры",
      "Уведомления",
      "Обращения и жалобы",
      "Коммунальные организации",
      "Помощь и частые вопросы",
    ]) {
      expect(screen.getByText(name), name).toBeInTheDocument();
    }
  });

  it("links a built section inside the current language", () => {
    render(<PortalSections lang="kk" labels={ru.home.portal} />);
    expect(screen.getByRole("link", { name: /Мои договоры/ })).toHaveAttribute(
      "href",
      "/kk/contracts",
    );
    expect(screen.getByRole("link", { name: /Коммунальные организации/ })).toHaveAttribute(
      "href",
      "/kk/organizations",
    );
    expect(screen.getByRole("link", { name: /Счётчики/ })).toHaveAttribute("href", "/kk/meters");
    expect(screen.getByRole("link", { name: /Начисления и оплата/ })).toHaveAttribute(
      "href",
      "/kk/billing",
    );
  });

  it("links every section now that all of them are built", () => {
    render(<PortalSections lang="ru" labels={ru.home.portal} />);
    expect(portalSections.every((section) => section.path !== null)).toBe(true);
    expect(screen.queryByText("Скоро")).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(portalSections.length);
  });

  it("marks a section that is not built as soon, and does not link to nowhere", () => {
    render(
      <PortalSections
        lang="ru"
        labels={ru.home.portal}
        sections={[
          { id: "meters", path: null, icon: "meter" },
          { id: "help", path: "/help", icon: "search" },
        ]}
      />,
    );
    expect(screen.getAllByText("Скоро")).toHaveLength(1);
    const tile = screen.getByText("Счётчики").closest("li") as HTMLElement;
    expect(within(tile).queryByRole("link")).not.toBeInTheDocument();
  });
});
