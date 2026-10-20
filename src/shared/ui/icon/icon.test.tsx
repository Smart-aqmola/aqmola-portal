import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon, iconNames } from "./icon";

describe("Icon", () => {
  it("is hidden from assistive technology", () => {
    const { container } = render(<Icon name="meter" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it("uses the requested size", () => {
    const { container } = render(<Icon name="water" size={40} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "40");
    expect(svg).toHaveAttribute("height", "40");
  });

  it("defaults to 22px", () => {
    const { container } = render(<Icon name="water" />);
    expect(container.querySelector("svg")).toHaveAttribute("width", "22");
  });

  it("draws something for every icon name", () => {
    for (const name of iconNames) {
      const { container, unmount } = render(<Icon name={name} />);
      expect(container.querySelector("svg")?.children.length, name).toBeGreaterThan(0);
      unmount();
    }
  });
});
