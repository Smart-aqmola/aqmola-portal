import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import en from "@/shared/i18n/dictionaries/en.json";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("shows the disclaimer that this is not a government service", () => {
    render(<SiteFooter lang="ru" dict={ru} />);
    expect(screen.getByText(/Не является государственным сервисом/)).toBeInTheDocument();
  });

  it("groups links under headings for residents, business and the region", () => {
    render(<SiteFooter lang="ru" dict={ru} />);
    for (const name of ["Жителям", "Бизнесу", "Регион"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
  });

  it("keeps links inside the current language", () => {
    render(<SiteFooter lang="kk" dict={ru} />);
    const links = within(screen.getByRole("contentinfo")).getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link.getAttribute("href")).toMatch(/^\/kk\//);
  });

  it("is translated", () => {
    render(<SiteFooter lang="en" dict={en} />);
    expect(screen.getByRole("heading", { name: "For residents" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My applications" })).toHaveAttribute(
      "href",
      "/en/applications",
    );
  });
});
