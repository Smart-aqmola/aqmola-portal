import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FAVORITES_KEY } from "../domain/favorites";
import { FavoriteButton } from "./favorite-button";

const labels = { add: "Добавить в избранное", remove: "Убрать из избранного" };

function resetStorage(value?: string) {
  window.localStorage.clear();
  if (value !== undefined) window.localStorage.setItem(FAVORITES_KEY, value);
  act(() => {
    window.dispatchEvent(new Event("storage"));
  });
}

describe("FavoriteButton", () => {
  beforeEach(() => resetStorage());
  afterEach(() => window.localStorage.clear());

  it("starts as not saved", () => {
    render(<FavoriteButton slug="gas-contract" labels={labels} />);
    const button = screen.getByRole("button", { name: "Добавить в избранное" });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("saves the service when clicked and remembers it in the browser", () => {
    render(<FavoriteButton slug="gas-contract" labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Добавить в избранное" }));

    const button = screen.getByRole("button", { name: "Убрать из избранного" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(JSON.parse(window.localStorage.getItem(FAVORITES_KEY)!)).toEqual(["gas-contract"]);
  });

  it("removes the service when clicked again", () => {
    render(<FavoriteButton slug="gas-contract" labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Добавить в избранное" }));
    fireEvent.click(screen.getByRole("button", { name: "Убрать из избранного" }));

    expect(screen.getByRole("button", { name: "Добавить в избранное" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(JSON.parse(window.localStorage.getItem(FAVORITES_KEY)!)).toEqual([]);
  });

  it("shows services saved earlier", () => {
    resetStorage('["epd-mailing"]');
    render(<FavoriteButton slug="epd-mailing" labels={labels} />);
    expect(screen.getByRole("button", { name: "Убрать из избранного" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps two buttons for the same service in step", () => {
    render(
      <>
        <FavoriteButton slug="gas-contract" labels={labels} />
        <FavoriteButton slug="gas-contract" labels={labels} />
        <FavoriteButton slug="epd-mailing" labels={labels} />
      </>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Добавить в избранное" })[0]);

    expect(screen.getAllByRole("button", { name: "Убрать из избранного" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Добавить в избранное" })).toHaveLength(1);
  });

  it("ignores damaged data in the browser storage", () => {
    resetStorage("{broken");
    render(<FavoriteButton slug="gas-contract" labels={labels} />);
    expect(screen.getByRole("button", { name: "Добавить в избранное" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
