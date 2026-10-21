import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import type { NewsCardData } from "../load-news";
import { NewsCard } from "./news-card";

const item: NewsCardData = {
  slug: "heat-flushing-kokshetau",
  date: "2026-10-18",
  title: "В Кокшетау стартовала промывка тепловых сетей",
  summary: "Работы продлятся неделю.",
  topic: "utilities",
  views: 120,
  photo: {
    url: "/photos/kokshetau-museum.jpg",
    alt: "Музей истории Кокшетау",
    credit: {
      author: "Kristianmusic",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Museum.jpg",
    },
  },
};

describe("NewsCard", () => {
  it("links the headline to the article", () => {
    render(<NewsCard item={item} lang="ru" dict={ru} />);
    expect(screen.getByRole("link", { name: item.title })).toHaveAttribute(
      "href",
      "/ru/news/heat-flushing-kokshetau",
    );
  });

  it("loads the photo lazily by default", () => {
    render(<NewsCard item={item} lang="ru" dict={ru} />);
    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");
  });

  it("loads the photo first when it is the one at the top of the page", () => {
    render(<NewsCard item={item} lang="ru" dict={ru} priority />);
    const photo = screen.getByRole("img");
    expect(photo).toHaveAttribute("fetchpriority", "high");
    expect(photo).not.toHaveAttribute("loading", "lazy");
  });
});
