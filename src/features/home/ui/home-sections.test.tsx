import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import en from "@/shared/i18n/dictionaries/en.json";
import type { HomeNews } from "../load-home";
import { ApplicationsPrompt } from "./applications-prompt";
import { ComingSoon } from "./coming-soon";
import { HomeSearch } from "./home-search";
import { NewsList } from "./news-list";
import { PlacesGrid, type HomePlace } from "./places-grid";

const photo = {
  url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/Zerenda_June_07.jpg/330px-Zerenda_June_07.jpg",
  alt: "Зеренда летом",
  credit: {
    author: "A",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:A.jpg",
  },
};

describe("HomeSearch", () => {
  const territories = [
    { id: "kokshetau", name: "Кокшетау" },
    { id: "burabay", name: "Бурабайский район" },
  ];

  function renderSearch() {
    return render(<HomeSearch lang="kk" labels={ru.home.search} territories={territories} />);
  }

  it("is a search form that opens the catalog of the current language", () => {
    renderSearch();
    const form = screen.getByRole("search", { name: "Поиск услуги" });
    expect(form).toHaveAttribute("action", "/kk/services");
    expect(form).toHaveAttribute("method", "get");
  });

  it("has fields named like the catalog address parameters", () => {
    renderSearch();
    expect(screen.getByRole("searchbox", { name: "Что нужно сделать" })).toHaveAttribute(
      "name",
      "q",
    );
    expect(screen.getByRole("combobox", { name: "Где" })).toHaveAttribute("name", "territory");
    expect(screen.getByRole("radio", { name: "Жителям" })).toHaveAttribute("name", "for");
  });

  it("offers the whole region first and then every territory", () => {
    renderSearch();
    const options = within(screen.getByRole("combobox", { name: "Где" })).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Вся область",
      "Кокшетау",
      "Бурабайский район",
    ]);
    expect(options.map((option) => option.getAttribute("value"))).toEqual([
      "",
      "kokshetau",
      "burabay",
    ]);
  });

  it("starts with residents selected and lets the visitor switch to business", () => {
    renderSearch();
    expect(screen.getByRole("radio", { name: "Жителям" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Бизнесу" }));
    expect(screen.getByRole("radio", { name: "Бизнесу" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Жителям" })).not.toBeChecked();
  });

  it("has a submit button", () => {
    renderSearch();
    expect(screen.getByRole("button", { name: "Найти" })).toHaveAttribute("type", "submit");
  });
});

describe("ApplicationsPrompt", () => {
  it("invites to sign in and shows the three statuses", () => {
    render(<ApplicationsPrompt lang="en" labels={en.home.applications} />);
    expect(screen.getByRole("heading", { name: "My applications" })).toBeInTheDocument();
    for (const status of ["Submitted", "In progress", "Completed"]) {
      expect(screen.getByText(status)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Open my applications" })).toHaveAttribute(
      "href",
      "/en/applications",
    );
  });
});

describe("NewsList", () => {
  const items: HomeNews[] = [
    {
      slug: "heat",
      date: "2026-10-18",
      title: "Промывка тепловых сетей",
      summary: "…",
      territory: "Кокшетау",
      photo,
    },
    { slug: "readings", date: "2026-10-15", title: "Показания онлайн", summary: "…", photo },
  ];

  it("lists the news with a readable date and the territory", () => {
    render(<NewsList lang="ru" title="Новости области" allLabel="Все новости" items={items} />);
    expect(screen.getByText("18 октября")).toBeInTheDocument();
    expect(screen.getByText(/Кокшетау/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Промывка тепловых сетей/ })).toHaveAttribute(
      "href",
      "/ru/news/heat",
    );
  });

  it("links to all news and describes the photos", () => {
    render(<NewsList lang="kk" title="Жаңалықтар" allLabel="Барлығы" items={items} />);
    expect(screen.getByRole("link", { name: "Барлығы" })).toHaveAttribute("href", "/kk/news");
    expect(screen.getAllByRole("img", { name: "Зеренда летом" })).toHaveLength(2);
  });
});

describe("PlacesGrid", () => {
  const places: HomePlace[] = [
    {
      slug: "burabay",
      name: "Бурабай",
      summary: "Национальный парк с озёрами.",
      territory: "Бурабайский район",
      facts: ["nature", "lake", "rest"],
      photo,
    },
  ];

  it("shows the place with its territory, summary and facts", () => {
    render(
      <PlacesGrid
        lang="ru"
        title="Куда поехать"
        allLabel="Весь туризм"
        factLabels={ru.home.tourism.facts}
        places={places}
      />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Бурабай" })).toBeInTheDocument();
    expect(screen.getByText("Бурабайский район")).toBeInTheDocument();
    for (const fact of ["Природа", "Озеро", "Отдых"])
      expect(screen.getByText(fact)).toBeInTheDocument();
  });

  it("loads photos lazily, but the first one first when the grid is at the top of the page", () => {
    const two: HomePlace[] = [places[0], { ...places[0], slug: "zerenda", name: "Зеренда" }];
    const { rerender } = render(
      <PlacesGrid lang="ru" factLabels={ru.home.tourism.facts} places={two} />,
    );
    for (const image of screen.getAllByRole("img")) {
      expect(image).toHaveAttribute("loading", "lazy");
    }

    rerender(
      <PlacesGrid lang="ru" factLabels={ru.home.tourism.facts} places={two} priorityFirst />,
    );
    const [first, second] = screen.getAllByRole("img");
    expect(first).toHaveAttribute("fetchpriority", "high");
    expect(second).toHaveAttribute("loading", "lazy");
  });

  it("links the place and the whole tourism section", () => {
    render(
      <PlacesGrid
        lang="en"
        title="Where"
        allLabel="All"
        factLabels={en.home.tourism.facts}
        places={places}
      />,
    );
    expect(screen.getByRole("link", { name: "Бурабай" })).toHaveAttribute(
      "href",
      "/en/tourism/burabay",
    );
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/en/tourism");
  });
});

describe("ComingSoon", () => {
  it("lists announced sections, each marked as in development", () => {
    render(
      <ComingSoon
        title="Скоро на портале"
        badge="В разработке"
        items={[
          { id: "a", title: "Транспорт", summary: "Маршруты" },
          { id: "b", title: "Библиотеки", summary: "Книги" },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Скоро на портале" })).toBeInTheDocument();
    expect(screen.getAllByText("В разработке")).toHaveLength(2);
    expect(screen.getByText("Транспорт")).toBeInTheDocument();
  });
});
