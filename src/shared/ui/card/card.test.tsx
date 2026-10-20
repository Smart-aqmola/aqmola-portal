import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./card";

describe("Card", () => {
  it("renders its content", () => {
    render(<Card>Водоканал</Card>);
    expect(screen.getByText("Водоканал")).toBeInTheDocument();
  });

  it("can render as a semantic element", () => {
    render(<Card as="article">Услуга</Card>);
    expect(screen.getByRole("article")).toHaveTextContent("Услуга");
  });

  it("exposes the padding for styling", () => {
    render(<Card padding="lg">Панель</Card>);
    expect(screen.getByText("Панель")).toHaveAttribute("data-padding", "lg");
  });
});
