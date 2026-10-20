import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "./language-switcher";

const usePathname = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

describe("LanguageSwitcher", () => {
  it("links to the same page in every language", () => {
    usePathname.mockReturnValue("/ru/services");
    render(<LanguageSwitcher lang="ru" label="Язык" />);
    const group = screen.getByRole("group", { name: "Язык" });
    expect(within(group).getByRole("link", { name: "ҚАЗ" })).toHaveAttribute(
      "href",
      "/kk/services",
    );
    expect(within(group).getByRole("link", { name: "ENG" })).toHaveAttribute(
      "href",
      "/en/services",
    );
    expect(within(group).getByRole("link", { name: "РУС" })).toHaveAttribute(
      "href",
      "/ru/services",
    );
  });

  it("marks only the current language", () => {
    usePathname.mockReturnValue("/kk");
    render(<LanguageSwitcher lang="kk" label="Тіл" />);
    expect(screen.getByRole("link", { name: "ҚАЗ" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "РУС" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "ENG" })).not.toHaveAttribute("aria-current");
  });

  it("declares the language of each link", () => {
    usePathname.mockReturnValue("/ru");
    render(<LanguageSwitcher lang="ru" label="Язык" />);
    expect(screen.getByRole("link", { name: "ҚАЗ" })).toHaveAttribute("hreflang", "kk");
    expect(screen.getByRole("link", { name: "ENG" })).toHaveAttribute("lang", "en");
  });
});
