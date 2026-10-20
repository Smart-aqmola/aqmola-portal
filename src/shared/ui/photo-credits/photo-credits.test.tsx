import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhotoCredits } from "./photo-credits";

const credits = [
  {
    author: "Noiembrie",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:A.jpg",
  },
  {
    author: "Dildakhmet",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:B.jpg",
  },
];

describe("PhotoCredits", () => {
  it("links every author to the source of the photo", () => {
    render(<PhotoCredits label="Фото" credits={credits} />);
    const link = screen.getByRole("link", { name: "Noiembrie" });
    expect(link).toHaveAttribute("href", "https://commons.wikimedia.org/wiki/File:A.jpg");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "Dildakhmet" })).toBeInTheDocument();
  });

  it("names the licence once", () => {
    render(<PhotoCredits label="Фото" credits={credits} />);
    expect(screen.getAllByText(/CC BY-SA 4\.0/)).toHaveLength(1);
  });

  it("shows the label", () => {
    render(<PhotoCredits label="Photo" credits={credits} />);
    expect(screen.getByText(/^Photo/)).toBeInTheDocument();
  });

  it("renders nothing without credits", () => {
    const { container } = render(<PhotoCredits label="Фото" credits={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
