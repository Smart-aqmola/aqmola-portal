import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShowMoreList } from "./show-more";

const labels = { shown: "Показано {n} из {total}", more: "Показать ещё {n}" };
const items = Array.from({ length: 45 }, (_, index) => `запись ${index + 1}`);

function List({ count }: { count: number }) {
  return (
    <ShowMoreList items={items.slice(0, count)} labels={labels}>
      {(visible) => (
        <ul>
          {visible.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </ShowMoreList>
  );
}

describe("ShowMoreList", () => {
  it("draws a short list whole, without the count and the button", () => {
    render(<List count={20} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("opens a long list part by part and then moves focus to the count", () => {
    render(<List count={45} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    expect(screen.getByText("Показано 20 из 45")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Показать ещё 20" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(40);

    fireEvent.click(screen.getByRole("button", { name: "Показать ещё 5" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(45);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Показано 45 из 45")).toHaveFocus();
  });
});
