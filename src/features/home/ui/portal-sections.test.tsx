import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { portalSections } from "../domain/home-content";
import { PortalSections } from "./portal-sections";

describe("PortalSections", () => {
  it("shows all nine sections of the specification", () => {
    render(<PortalSections lang="ru" labels={ru.home.portal} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(9);
    for (const name of [
      "Заключение договоров",
      "Счётчики",
      "Начисления и оплата",
      "Мои заявки",
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
    expect(screen.getByRole("link", { name: /Мои заявки/ })).toHaveAttribute(
      "href",
      "/kk/applications",
    );
    expect(screen.getByRole("link", { name: /Коммунальные организации/ })).toHaveAttribute(
      "href",
      "/kk/organizations",
    );
    expect(screen.getByRole("link", { name: /Счётчики/ })).toHaveAttribute("href", "/kk/meters");
  });

  it("marks a section that is not built as soon, and does not link to nowhere", () => {
    render(<PortalSections lang="ru" labels={ru.home.portal} />);
    const notBuilt = portalSections.filter((section) => section.path === null);
    expect(screen.getAllByText("Скоро")).toHaveLength(notBuilt.length);
    const tile = screen.getByText("Начисления и оплата").closest("li") as HTMLElement;
    expect(within(tile).queryByRole("link")).not.toBeInTheDocument();
  });
});
