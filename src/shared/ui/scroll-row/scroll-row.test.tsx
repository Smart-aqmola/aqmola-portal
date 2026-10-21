import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScrollRow } from "./scroll-row";

function setLayout(element: HTMLElement, layout: { scrollWidth: number; clientWidth: number }) {
  Object.defineProperty(element, "scrollWidth", { configurable: true, value: layout.scrollWidth });
  Object.defineProperty(element, "clientWidth", { configurable: true, value: layout.clientWidth });
}

function renderRow() {
  const result = render(
    <ScrollRow label="Показать ещё категории">
      <li>Все</li>
      <li>Вода</li>
    </ScrollRow>,
  );
  const list = screen.getByRole("list");
  return { ...result, list };
}

describe("ScrollRow", () => {
  it("renders the items inside a list", () => {
    renderRow();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("hides the arrow when everything fits", () => {
    const { list } = renderRow();
    setLayout(list, { scrollWidth: 300, clientWidth: 300 });
    act(() => {
      fireEvent.scroll(list);
    });
    expect(screen.queryByRole("button", { name: "Показать ещё категории" })).toBeNull();
  });

  it("shows the arrow while there is more to the right and hides it at the end", () => {
    const { list } = renderRow();
    setLayout(list, { scrollWidth: 900, clientWidth: 300 });
    list.scrollLeft = 0;
    act(() => {
      fireEvent.scroll(list);
    });
    expect(screen.getByRole("button", { name: "Показать ещё категории" })).toBeInTheDocument();

    list.scrollLeft = 600;
    act(() => {
      fireEvent.scroll(list);
    });
    expect(screen.queryByRole("button", { name: "Показать ещё категории" })).toBeNull();
  });

  it("scrolls the row by most of its width when the arrow is pressed", () => {
    const { list } = renderRow();
    setLayout(list, { scrollWidth: 900, clientWidth: 300 });
    const scrollBy = vi.fn();
    list.scrollBy = scrollBy;
    act(() => {
      fireEvent.scroll(list);
    });
    fireEvent.click(screen.getByRole("button", { name: "Показать ещё категории" }));
    expect(scrollBy).toHaveBeenCalledWith({ left: 180, behavior: "smooth" });
  });
});
