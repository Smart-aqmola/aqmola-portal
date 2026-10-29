import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { ServiceCard } from "./service-card";
import type { ServiceCardData } from "./service-card-data";

const service: ServiceCardData = {
  slug: "water-meter-readings",
  code: "1001",
  title: "Передача показаний приборов учёта воды",
  summary: "Передайте показания без визита в абонентский отдел.",
  organization: "Водоканал Акмолы",
  categoryId: "water",
  situationId: "meters",
  free: true,
  documents: ["identity"],
  workingDays: 1,
  channel: "online",
  audience: "resident",
  popular: true,
  isNew: false,
};

function renderCard(overrides: Partial<ServiceCardData> = {}, lang: "ru" | "kk" = "ru") {
  return render(
    <ServiceCard service={{ ...service, ...overrides }} lang={lang} labels={ru.home.service} />,
  );
}

describe("ServiceCard", () => {
  it("shows title, provider, summary and the free badge", () => {
    renderCard();
    expect(
      screen.getByRole("heading", { level: 3, name: "Передача показаний приборов учёта воды" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Водоканал Акмолы")).toBeInTheDocument();
    expect(screen.getByText(/без визита/)).toBeInTheDocument();
    expect(screen.getByText("Бесплатно")).toBeInTheDocument();
  });

  it("does not claim a free service when it costs money", () => {
    renderCard({ free: false });
    expect(screen.queryByText("Бесплатно")).not.toBeInTheDocument();
  });

  it("shows the cost of a paid service", () => {
    renderCard({ free: false, price: 6500 });
    expect(screen.queryByText("Бесплатно")).not.toBeInTheDocument();
    expect(screen.getByText(/6\s?500 ₸/)).toBeInTheDocument();
  });

  it("lists the documents to prepare when it knows their names", () => {
    render(
      <ServiceCard
        service={{ ...service, documents: ["identity", "meterPhoto"] }}
        lang="ru"
        labels={ru.home.service}
        documentNames={ru.serviceDetails.documents.items}
      />,
    );
    expect(
      screen.getByText(
        "Документы: Документ, удостоверяющий личность, Фото прибора учёта с текущими показаниями",
      ),
    ).toBeInTheDocument();
  });

  it("does not list documents when the names are not given", () => {
    renderCard();
    expect(screen.queryByText(/^Документы:/)).not.toBeInTheDocument();
  });

  it("puts how the service is provided, how long it takes and its number in one line", () => {
    renderCard();
    const facts = screen.getByRole("list");
    expect(within(facts).getByText("Онлайн")).toBeInTheDocument();
    expect(within(facts).getByText("1 раб. дн.")).toBeInTheDocument();
    expect(within(facts).getByText("№ 1001")).toBeInTheDocument();
  });

  it("says when a visit is needed", () => {
    renderCard({ channel: "front-office", workingDays: 10 });
    expect(screen.getByText("Нужен визит")).toBeInTheDocument();
    expect(screen.getByText("10 раб. дн.")).toBeInTheDocument();
  });

  it("leaves the audience to the Residents / Business switch", () => {
    renderCard({ audience: "both" });
    expect(screen.queryByText("Жителям")).not.toBeInTheDocument();
    expect(screen.queryByText("Жителям и бизнесу")).not.toBeInTheDocument();
  });

  it("shows a heart only when favorites are switched on", () => {
    const { unmount } = renderCard();
    expect(screen.queryByRole("button", { name: "Добавить в избранное" })).not.toBeInTheDocument();
    unmount();
    render(
      <ServiceCard
        service={service}
        lang="ru"
        labels={ru.home.service}
        favoriteLabels={ru.catalog.favorites}
      />,
    );
    expect(screen.getByRole("button", { name: "Добавить в избранное" })).toBeInTheDocument();
  });

  it("marks new services", () => {
    renderCard({ isNew: true });
    expect(screen.getByText("Новое")).toBeInTheDocument();
  });

  it("links to the details and to the application inside the current language", () => {
    renderCard({}, "kk");
    expect(screen.getByRole("link", { name: "Подробнее" })).toHaveAttribute(
      "href",
      "/kk/services/water-meter-readings",
    );
    expect(screen.getByRole("link", { name: "Заказать услугу" })).toHaveAttribute(
      "href",
      "/kk/services/water-meter-readings/apply",
    );
  });
});
