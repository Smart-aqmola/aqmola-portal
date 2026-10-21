import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageSkeleton } from "./page-skeleton";

describe("PageSkeleton", () => {
  it("is hidden from assistive technology and shows no text", () => {
    const { container } = render(<PageSkeleton />);
    const root = screen.getByTestId("page-skeleton");
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(container).toHaveTextContent("");
  });

  it("draws a title, a lead and the requested number of content blocks", () => {
    render(<PageSkeleton blocks={4} />);
    const root = screen.getByTestId("page-skeleton");
    // one title, one lead and four blocks
    expect(root.children).toHaveLength(6);
  });

  it("draws three blocks by default", () => {
    render(<PageSkeleton />);
    expect(screen.getByTestId("page-skeleton").children).toHaveLength(5);
  });
});
