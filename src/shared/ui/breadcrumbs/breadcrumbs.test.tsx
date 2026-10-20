import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "./breadcrumbs";

const items = [
  { label: "Главная", href: "/ru" },
  { label: "Услуги", href: "/ru/services" },
  { label: "Договор газоснабжения" },
];

describe("Breadcrumbs", () => {
  it("is a labelled navigation with an ordered list", () => {
    render(<Breadcrumbs label="Вы здесь" items={items} />);
    const nav = screen.getByRole("navigation", { name: "Вы здесь" });
    expect(within(nav).getAllByRole("listitem")).toHaveLength(3);
  });

  it("links the parents and shows the current page as plain text", () => {
    render(<Breadcrumbs label="Вы здесь" items={items} />);
    expect(screen.getByRole("link", { name: "Главная" })).toHaveAttribute("href", "/ru");
    expect(screen.getByRole("link", { name: "Услуги" })).toHaveAttribute("href", "/ru/services");
    expect(screen.queryByRole("link", { name: "Договор газоснабжения" })).not.toBeInTheDocument();
    expect(screen.getByText("Договор газоснабжения")).toHaveAttribute("aria-current", "page");
  });

  it("does not link the last item even if it has an address", () => {
    render(
      <Breadcrumbs
        label="Вы здесь"
        items={[
          { label: "Главная", href: "/ru" },
          { label: "Услуги", href: "/ru/services" },
        ]}
      />,
    );
    expect(screen.queryByRole("link", { name: "Услуги" })).not.toBeInTheDocument();
    expect(screen.getByText("Услуги")).toHaveAttribute("aria-current", "page");
  });
});
