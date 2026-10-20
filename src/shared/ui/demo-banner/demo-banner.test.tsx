import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoBanner } from "./demo-banner";

describe("DemoBanner", () => {
  it("shows the given notice as a note", () => {
    render(<DemoBanner text="Тестовая версия портала." />);
    expect(screen.getByRole("note")).toHaveTextContent("Тестовая версия портала.");
  });
});
