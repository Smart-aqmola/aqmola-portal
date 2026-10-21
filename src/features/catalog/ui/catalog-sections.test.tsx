import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import en from "@/shared/i18n/dictionaries/en.json";
import { catalogHref } from "../domain/catalog-params";
import type { CatalogData } from "../load-catalog";
import { CatalogFilters } from "./catalog-filters";
import { CatalogResults } from "./catalog-results";
import { CategoryChips } from "./category-chips";
import { Pagination } from "./pagination";
import { paginationItems } from "./pagination-items";
import type { ServiceCardData } from "./service-card-data";

const card: ServiceCardData = {
  slug: "gas-contract",
  code: "1020",
  title: "Заключение договора газоснабжения",
  summary: "Подпишите договор онлайн.",
  organization: "Газ Акмола",
  categoryId: "gas",
  situationId: "contracts",
  free: true,
  documents: ["identity"],
  workingDays: 5,
  channel: "online",
  audience: "resident",
  popular: false,
  isNew: false,
};

const data: Pick<CatalogData, "params" | "situations" | "organizations" | "territories"> = {
  params: { q: "газ", audience: "business", territory: "burabay", category: "gas", page: 2 },
  situations: [
    { id: "meters", name: "Приборы учёта и показания" },
    { id: "contracts", name: "Договоры, лицевые счета и ЕПД" },
  ],
  organizations: [{ id: "akmola-gas", name: "Газ Акмола" }],
  territories: [
    { id: "kokshetau", name: "Кокшетау" },
    { id: "burabay", name: "Бурабайский район" },
  ],
};

describe("paginationItems", () => {
  const shown = (current: number, count: number) =>
    paginationItems(current, count).map((item) => (item.type === "gap" ? "…" : item.page));

  it("shows every number when there are few pages", () => {
    expect(shown(1, 3)).toEqual([1, 2, 3]);
    expect(shown(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("shortens long lists around the current page", () => {
    expect(shown(1, 11)).toEqual([1, 2, "…", 11]);
    expect(shown(6, 11)).toEqual([1, "…", 5, 6, 7, "…", 11]);
    expect(shown(11, 11)).toEqual([1, "…", 10, 11]);
  });

  it("writes a number instead of a gap that would hide just one page", () => {
    expect(shown(4, 9)).toEqual([1, 2, 3, 4, 5, "…", 9]);
  });

  it("has a single page for an empty result", () => {
    expect(shown(1, 1)).toEqual([1]);
  });
});

describe("CatalogFilters", () => {
  function renderFilters() {
    return render(<CatalogFilters lang="ru" labels={ru.catalog} data={data} />);
  }

  it("is a search form for the catalog of the current language", () => {
    renderFilters();
    const form = screen.getByRole("search", { name: "Поиск и фильтры" });
    expect(form).toHaveAttribute("action", "/ru/services");
    expect(form).toHaveAttribute("method", "get");
  });

  it("shows the current filters", () => {
    renderFilters();
    expect(screen.getByRole("searchbox", { name: "Название или номер услуги" })).toHaveValue("газ");
    expect(screen.getByRole("radio", { name: "Бизнесу" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Где" })).toHaveValue("burabay");
    expect(screen.getByRole("combobox", { name: "Жизненная ситуация" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Организация" })).toHaveValue("");
  });

  it("keeps the chosen category when the filters are applied", () => {
    const { container } = renderFilters();
    const hidden = container.querySelector('input[type="hidden"]');
    expect(hidden).toHaveAttribute("name", "category");
    expect(hidden).toHaveAttribute("value", "gas");
  });

  it("offers every situation, provider and territory with an 'all' choice first", () => {
    renderFilters();
    const territories = within(screen.getByRole("combobox", { name: "Где" })).getAllByRole(
      "option",
    );
    expect(territories.map((option) => option.textContent)).toEqual([
      "Вся область",
      "Кокшетау",
      "Бурабайский район",
    ]);
    expect(
      within(screen.getByRole("combobox", { name: "Организация" })).getAllByRole("option")[0],
    ).toHaveTextContent("Все организации");
  });

  it("can reset all filters", () => {
    renderFilters();
    expect(screen.getByRole("link", { name: "Сбросить фильтры" })).toHaveAttribute(
      "href",
      "/ru/services",
    );
  });

  it("is translated", () => {
    render(<CatalogFilters lang="en" labels={en.catalog} data={data} />);
    expect(screen.getByRole("button", { name: "Show" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Business" })).toBeChecked();
  });
});

describe("CategoryChips", () => {
  const categories: CatalogData["categories"] = [
    { id: "water", name: "Водоснабжение", count: 7 },
    { id: "gas", name: "Газоснабжение", count: 3 },
    { id: "heat", name: "Теплоснабжение", count: 0 },
  ];

  it("shows every category with its number and a total in 'All'", () => {
    render(
      <CategoryChips
        lang="ru"
        labels={ru.catalog.categories}
        params={{ q: "", audience: "resident", page: 1 }}
        categories={categories}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Категории услуг" });
    expect(within(nav).getByRole("link", { name: /^Все\s*10$/ })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /Водоснабжение\s*7/ })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /Теплоснабжение\s*0/ })).toBeInTheDocument();
  });

  it("marks the chosen category and keeps the other filters in the links", () => {
    const params = {
      q: "договор",
      audience: "business" as const,
      territory: "burabay",
      category: "gas" as const,
      page: 3,
    };
    render(
      <CategoryChips
        lang="ru"
        labels={ru.catalog.categories}
        params={params}
        categories={categories}
      />,
    );

    expect(screen.getByRole("link", { name: /Газоснабжение/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: /^Все/ })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: /Водоснабжение/ })).toHaveAttribute(
      "href",
      catalogHref("ru", {
        q: "договор",
        audience: "business",
        territory: "burabay",
        category: "water",
      }),
    );
    expect(screen.getByRole("link", { name: /^Все/ })).toHaveAttribute(
      "href",
      catalogHref("ru", { q: "договор", audience: "business", territory: "burabay" }),
    );
  });

  it("marks 'All' when no category is chosen", () => {
    render(
      <CategoryChips
        lang="kk"
        labels={ru.catalog.categories}
        params={{ q: "", audience: "resident", page: 1 }}
        categories={categories}
      />,
    );
    expect(screen.getByRole("link", { name: /^Все/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: /^Все/ })).toHaveAttribute("href", "/kk/services");
  });
});

describe("CatalogResults", () => {
  it("shows how many services were found and one card for each", () => {
    render(<CatalogResults lang="ru" dict={ru} data={{ cards: [card], total: 14 }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Найдено услуг: 14");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Добавить в избранное" })).toBeInTheDocument();
  });

  it("explains an empty result and offers to reset the filters", () => {
    render(<CatalogResults lang="ru" dict={ru} data={{ cards: [], total: 0 }} />);
    expect(screen.getByRole("heading", { name: "Ничего не найдено" })).toBeInTheDocument();
    expect(screen.getByText("Измените запрос или сбросьте фильтры.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Сбросить фильтры" })).toHaveAttribute(
      "href",
      "/ru/services",
    );
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
});

describe("Pagination", () => {
  const hrefFor = (page: number) => catalogHref("ru", { q: "вода", page });

  it("renders nothing for a single page", () => {
    const { container } = render(
      <Pagination page={1} pageCount={1} labels={ru.catalog.pagination} hrefFor={hrefFor} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("links every shown page, keeping the search, and marks the current one", () => {
    render(<Pagination page={2} pageCount={3} labels={ru.catalog.pagination} hrefFor={hrefFor} />);
    const nav = screen.getByRole("navigation", { name: "Страницы каталога" });
    expect(within(nav).getByRole("link", { name: "Страница 2" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Страница 1" })).toHaveAttribute(
      "href",
      "/ru/services?q=%D0%B2%D0%BE%D0%B4%D0%B0",
    );
    expect(within(nav).getByRole("link", { name: "Страница 3" })).toHaveAttribute(
      "href",
      "/ru/services?q=%D0%B2%D0%BE%D0%B4%D0%B0&page=3",
    );
  });

  it("has previous and next links in the middle", () => {
    render(<Pagination page={2} pageCount={3} labels={ru.catalog.pagination} hrefFor={hrefFor} />);
    expect(screen.getByRole("link", { name: "Назад" })).toHaveAttribute("rel", "prev");
    expect(screen.getByRole("link", { name: "Вперёд" })).toHaveAttribute("rel", "next");
  });

  it("disables the previous link on the first page and the next link on the last", () => {
    const { unmount } = render(
      <Pagination page={1} pageCount={3} labels={ru.catalog.pagination} hrefFor={hrefFor} />,
    );
    expect(screen.queryByRole("link", { name: "Назад" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Вперёд" })).toBeInTheDocument();
    unmount();

    render(<Pagination page={3} pageCount={3} labels={ru.catalog.pagination} hrefFor={hrefFor} />);
    expect(screen.queryByRole("link", { name: "Вперёд" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Назад" })).toBeInTheDocument();
  });
});
