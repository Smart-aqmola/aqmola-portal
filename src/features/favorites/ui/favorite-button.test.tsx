import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ToastProvider } from "@/shared/ui/toast/toast-provider";
import { FAVORITES_KEY } from "../domain/favorites";
import { FavoriteButton } from "./favorite-button";

const labels = {
  add: "Добавить в избранное",
  remove: "Убрать из избранного",
  added: "Добавлено в избранное",
  removed: "Убрано из избранного",
};

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

  describe("toast", () => {
    it("announces when a service is added and when it is removed", () => {
      render(
        <ToastProvider>
          <FavoriteButton slug="gas-contract" labels={labels} />
        </ToastProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Добавить в избранное" }));
      expect(screen.getByRole("log")).toHaveTextContent("Добавлено в избранное");

      fireEvent.click(screen.getByRole("button", { name: "Убрать из избранного" }));
      expect(screen.getByRole("log")).toHaveTextContent("Убрано из избранного");
    });

    it("stays quiet for a service restored from the browser", () => {
      resetStorage('["gas-contract"]');
      render(
        <ToastProvider>
          <FavoriteButton slug="gas-contract" labels={labels} />
        </ToastProvider>,
      );
      expect(screen.getByRole("log")).toBeEmptyDOMElement();
    });
  });

  describe("pop animation", () => {
    it("plays when a service is added and stops when it ends", () => {
      render(<FavoriteButton slug="gas-contract" labels={labels} />);
      const button = screen.getByRole("button", { name: "Добавить в избранное" });
      expect(button).not.toHaveAttribute("data-pop");

      fireEvent.click(button);
      expect(button).toHaveAttribute("data-pop", "true");

      // jsdom has no AnimationEvent, so React listens for the prefixed name there.
      fireEvent(button, new Event("webkitAnimationEnd", { bubbles: true }));
      expect(button).not.toHaveAttribute("data-pop");
    });

    it("does not play for a service saved earlier or when it is removed", () => {
      resetStorage('["gas-contract"]');
      render(<FavoriteButton slug="gas-contract" labels={labels} />);
      const button = screen.getByRole("button", { name: "Убрать из избранного" });
      expect(button).not.toHaveAttribute("data-pop");

      fireEvent.click(button);
      expect(button).not.toHaveAttribute("data-pop");
    });
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
