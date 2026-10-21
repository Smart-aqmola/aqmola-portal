import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Reveal } from "./reveal";

type ObserverCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;

let callback: ObserverCallback | undefined;
const observe = vi.fn();
const unobserve = vi.fn();
const disconnect = vi.fn();

function mockObserver() {
  class FakeObserver {
    constructor(cb: ObserverCallback) {
      callback = cb;
    }
    observe = observe;
    unobserve = unobserve;
    disconnect = disconnect;
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
}

function placeBlock(top: number) {
  // jsdom has no layout: report the block position by hand.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top,
    bottom: top + 100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  });
}

function mockMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: reduce }));
}

describe("Reveal", () => {
  beforeEach(() => {
    callback = undefined;
    observe.mockClear();
    unobserve.mockClear();
    disconnect.mockClear();
    vi.stubGlobal("innerHeight", 800);
    mockObserver();
    mockMotion(false);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("always renders its children", () => {
    placeBlock(2000);
    render(<Reveal>Новости</Reveal>);
    expect(screen.getByText("Новости")).toBeInTheDocument();
  });

  it("leaves a block that is already on screen alone", () => {
    placeBlock(100);
    render(<Reveal>Новости</Reveal>);
    expect(screen.getByText("Новости")).not.toHaveAttribute("data-reveal");
    expect(observe).not.toHaveBeenCalled();
  });

  it("hides a block below the fold and shows it when it scrolls into view", () => {
    placeBlock(2000);
    render(<Reveal>Новости</Reveal>);
    const block = screen.getByText("Новости");
    expect(block).toHaveAttribute("data-reveal", "hidden");

    callback?.([{ isIntersecting: false, target: block }]);
    expect(block).toHaveAttribute("data-reveal", "hidden");

    callback?.([{ isIntersecting: true, target: block }]);
    expect(block).toHaveAttribute("data-reveal", "shown");
    expect(unobserve).toHaveBeenCalledWith(block);
  });

  it("does not hide anything for people who asked for less motion", () => {
    mockMotion(true);
    placeBlock(2000);
    render(<Reveal>Новости</Reveal>);
    expect(screen.getByText("Новости")).not.toHaveAttribute("data-reveal");
  });

  it("does not hide anything when the browser cannot observe scrolling", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    placeBlock(2000);
    render(<Reveal>Новости</Reveal>);
    expect(screen.getByText("Новости")).not.toHaveAttribute("data-reveal");
  });

  it("stops observing when it is removed", () => {
    placeBlock(2000);
    const { unmount } = render(<Reveal>Новости</Reveal>);
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
