import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import type { HomeSlide } from "../load-home";
import { PlacesSlider } from "./places-slider";

const credit = { author: "A", license: "CC BY-SA 4.0", sourceUrl: "https://example.org/a" };
const slide = (slug: string, name: string): HomeSlide => ({
  slug,
  name,
  summary: `${name}: озёра и сосны.`,
  territory: "Бурабайский район",
  photo: { url: `/photos/${slug}.jpg`, alt: name, credit },
});
const places = [
  slide("burabay", "Бурабай"),
  slide("okzhetpes", "Окжетпес"),
  slide("zerenda", "Зеренда"),
];

function renderSlider() {
  return render(
    <PlacesSlider
      lang="ru"
      places={places}
      labels={ru.home.slider}
      allLabel={ru.home.tourism.all}
    />,
  );
}

const current = () => screen.getByRole("heading", { level: 3 });

describe("PlacesSlider", () => {
  it("starts with the first place and links to it and to all places", () => {
    renderSlider();
    expect(current()).toHaveTextContent("Бурабай");
    expect(screen.getByText("1 из 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Подробнее" })).toHaveAttribute(
      "href",
      "/ru/tourism/burabay",
    );
    expect(screen.getByRole("link", { name: "Весь туризм" })).toHaveAttribute(
      "href",
      "/ru/tourism",
    );
  });

  it("goes round with the arrows: after the last comes the first again", () => {
    renderSlider();
    fireEvent.click(screen.getByRole("button", { name: "Предыдущее место" }));
    expect(current()).toHaveTextContent("Зеренда");
    expect(screen.getByText("3 из 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Следующее место" }));
    expect(current()).toHaveTextContent("Бурабай");
  });

  it("shows the other places as cards and makes the clicked one current", () => {
    renderSlider();
    const cards = screen.getByRole("list");
    expect(within(cards).queryByRole("button", { name: /^Бурабай / })).toBeNull();
    fireEvent.click(within(cards).getByRole("button", { name: /^Зеренда/ }));
    expect(current()).toHaveTextContent("Зеренда");
    expect(screen.getByRole("link", { name: "Подробнее" })).toHaveAttribute(
      "href",
      "/ru/tourism/zerenda",
    );
  });

  it("tells a screen reader which place is shown", () => {
    renderSlider();
    fireEvent.click(screen.getByRole("button", { name: "Следующее место" }));
    expect(current().closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
  });
});
