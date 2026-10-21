import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { Faq } from "./faq";

describe("Faq", () => {
  it("lists every question of the dictionary and keeps each answer behind its question", () => {
    const { container } = render(<Faq labels={ru.help} />);
    const items = Object.values(ru.help.items);
    expect(container.querySelectorAll("details")).toHaveLength(items.length);
    for (const item of items) {
      const question = screen.getByText(item.q);
      expect(question.tagName).toBe("SUMMARY");
      expect(question.closest("details")).toContainElement(screen.getByText(item.a));
    }
  });

  it("is closed at first so the page stays short", () => {
    const { container } = render(<Faq labels={ru.help} />);
    expect(container.querySelectorAll("details[open]")).toHaveLength(0);
  });
});
