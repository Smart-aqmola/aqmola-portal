import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RotatingWords } from "./rotating-words";

const words = ["вода", "тепло", "свет"];

function mockMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: reduce }));
}

describe("RotatingWords", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMotion(false);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts with the first word after the prefix", () => {
    render(<RotatingWords prefix="Заявки онлайн:" words={words} />);
    expect(screen.getByTestId("rotating-word")).toHaveTextContent("вода");
    expect(screen.getByText("Заявки онлайн:")).toBeInTheDocument();
  });

  it("gives screen readers the whole list once and hides the moving word", () => {
    render(<RotatingWords prefix="Заявки онлайн:" words={words} />);
    expect(screen.getByTestId("rotating-word")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("вода, тепло, свет")).toBeInTheDocument();
  });

  it("moves to the next word on a timer and wraps around", () => {
    render(<RotatingWords prefix="Заявки онлайн:" words={words} />);

    // The word is a new element each time, which restarts its entrance animation.
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(screen.getByTestId("rotating-word")).toHaveTextContent("тепло");

    act(() => {
      vi.advanceTimersByTime(2600 * 2);
    });
    expect(screen.getByTestId("rotating-word")).toHaveTextContent("вода");
  });

  it("stays on the first word for people who asked for less motion", () => {
    mockMotion(true);
    render(<RotatingWords prefix="Заявки онлайн:" words={words} />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByTestId("rotating-word")).toHaveTextContent("вода");
  });

  it("stops the timer when it is removed", () => {
    const { unmount } = render(<RotatingWords prefix="Заявки онлайн:" words={words} />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not rotate a single word", () => {
    render(<RotatingWords prefix="Заявки онлайн:" words={["вода"]} />);
    expect(vi.getTimerCount()).toBe(0);
  });
});
