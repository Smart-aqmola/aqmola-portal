import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import type { ServiceCardData } from "@/features/catalog/ui/service-card-data";
import type { SituationGroup } from "../load-home";
import { SituationServices } from "./situation-services";

function card(slug: string, title: string): ServiceCardData {
  return {
    slug,
    code: "1001",
    title,
    summary: "Описание",
    organization: "Организация",
    categoryId: "water",
    situationId: "meters",
    free: true,
    documents: ["identity"],
    workingDays: 3,
    channel: "online",
    audience: "resident",
    popular: true,
    isNew: false,
  };
}

const groups: SituationGroup[] = [
  {
    id: "meters",
    name: "Счётчики",
    summary: "Показания",
    count: 6,
    services: [card("a", "Передача показаний воды"), card("b", "Замена электросчётчика")],
  },
  {
    id: "connection",
    name: "Подключение",
    summary: "Условия",
    count: 7,
    services: [card("c", "Техусловия на воду")],
  },
  { id: "appeals", name: "Обращения", summary: "Аварии", count: 4, services: [] },
];

function renderTabs() {
  return render(
    <SituationServices
      lang="ru"
      title={ru.home.situations.title}
      groups={groups}
      labels={ru.home.situations}
      serviceLabels={ru.home.service}
      favoriteLabels={ru.catalog.favorites}
      documentNames={ru.serviceDetails.documents.items}
    />,
  );
}

describe("SituationServices", () => {
  it("shows a tab for every life situation and selects the first", () => {
    renderTabs();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Счётчики", "Подключение", "Обращения"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  });

  it("shows the popular services of the selected situation", () => {
    renderTabs();
    const panel = screen.getByRole("tabpanel");
    expect(
      within(panel).getByRole("heading", { name: "Популярные услуги: Счётчики" }),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Передача показаний воды")).toBeInTheDocument();
    expect(within(panel).getByText("Замена электросчётчика")).toBeInTheDocument();
  });

  it("switches the services when another tab is clicked", () => {
    renderTabs();
    fireEvent.click(screen.getByRole("tab", { name: "Подключение" }));
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("Техусловия на воду")).toBeInTheDocument();
    expect(within(panel).queryByText("Передача показаний воды")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Подключение" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("links the panel to the whole situation in the catalog", () => {
    renderTabs();
    fireEvent.click(screen.getByRole("tab", { name: "Подключение" }));
    expect(screen.getByRole("link", { name: "Все услуги" })).toHaveAttribute(
      "href",
      "/ru/situations/connection",
    );
  });

  it("supports the arrow keys, Home and End like standard tabs", () => {
    renderTabs();
    const first = screen.getByRole("tab", { name: "Счётчики" });
    first.focus();

    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Подключение" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Подключение" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: "Подключение" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "Обращения" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("tab", { name: "Обращения" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Счётчики" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("tab", { name: "Счётчики" }), { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Обращения" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("tab", { name: "Обращения" }), { key: "Home" });
    expect(screen.getByRole("tab", { name: "Счётчики" })).toHaveFocus();
  });

  it("lets only the selected tab take focus with Tab", () => {
    renderTabs();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
  });

  it("offers a button to scroll the row of situations", () => {
    renderTabs();
    expect(screen.getByRole("button", { name: "Показать ещё ситуации" })).toBeInTheDocument();
  });

  it("copes with a situation without services", () => {
    renderTabs();
    fireEvent.click(screen.getByRole("tab", { name: "Обращения" }));
    expect(within(screen.getByRole("tabpanel")).queryAllByRole("article")).toHaveLength(0);
  });
});
