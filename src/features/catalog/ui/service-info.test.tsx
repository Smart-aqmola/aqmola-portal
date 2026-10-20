import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import en from "@/shared/i18n/dictionaries/en.json";
import type { ServiceDetails } from "../load-service";
import { DocumentsList, FactsPanel, StepsList } from "./service-info";

const details: ServiceDetails = {
  organizationId: "org-test",
  card: {
    slug: "water-meter-sealing",
    code: "1005",
    title: "Опломбировка водомера",
    summary: "Заявка на опломбировку.",
    organization: "Водоканал Акмолы",
    categoryId: "water",
    situationId: "meters",
    free: true,
    workingDays: 5,
    channel: "front-office",
    audience: "resident",
    popular: false,
    isNew: false,
  },
  code: "1005",
  fullTitle: "Опломбировка нового или поверенного прибора учёта воды",
  updatedAt: "2026-10-15",
  situation: { id: "meters", name: "Приборы учёта и показания" },
  category: { id: "water", name: "Водоснабжение и водоотведение" },
  steps: ["login", "data", "documents", "review", "sign", "visit", "result"],
  documents: ["identity", "meterPhoto"],
  area: { kind: "region" },
  related: [],
};

describe("StepsList", () => {
  it("numbers the steps in order", () => {
    render(<StepsList steps={details.steps} dict={ru} />);
    expect(screen.getByRole("heading", { name: "Как получить услугу" })).toBeInTheDocument();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(7);
    expect(items[0]).toHaveTextContent("Войдите в демо-кабинет");
    expect(items[5]).toHaveTextContent("Придёт специалист");
    expect(items[6]).toHaveTextContent("Мои заявки");
    expect(screen.getByRole("list").tagName).toBe("OL");
  });
});

describe("DocumentsList", () => {
  it("lists the documents in the language of the visitor", () => {
    render(<DocumentsList documents={details.documents} dict={en} />);
    expect(screen.getByRole("heading", { name: "Documents you will need" })).toBeInTheDocument();
    expect(screen.getByText("Identity document")).toBeInTheDocument();
    expect(screen.getByText("Photo of the meter with current readings")).toBeInTheDocument();
  });
});

describe("FactsPanel", () => {
  function value(term: string) {
    return screen.getByText(term, { selector: "dt" }).nextElementSibling;
  }

  it("answers who, how, how long, where and when", () => {
    render(<FactsPanel details={details} lang="ru" dict={ru} />);
    expect(value("Исполнитель")).toHaveTextContent("Водоканал Акмолы");
    expect(value("Для кого")).toHaveTextContent("Жителям");
    expect(value("Как предоставляется")).toHaveTextContent("Нужен визит");
    expect(value("Стоимость")).toHaveTextContent("Бесплатно");
    expect(value("Срок ответа")).toHaveTextContent("до 5 раб. дн.");
    expect(value("Где доступно")).toHaveTextContent("Вся область");
    expect(value("Дата изменения")).toHaveTextContent("15 октября 2026");
    expect(value("Номер услуги")).toHaveTextContent("1005");
  });

  it("shows the full official name when there is one", () => {
    render(<FactsPanel details={details} lang="ru" dict={ru} />);
    expect(value("Полное название")).toHaveTextContent("Опломбировка нового или поверенного");
  });

  it("leaves the full name out when the title already says everything", () => {
    render(<FactsPanel details={{ ...details, fullTitle: undefined }} lang="ru" dict={ru} />);
    expect(screen.queryByText("Полное название")).not.toBeInTheDocument();
  });

  it("names the territories when the provider works only in some of them", () => {
    render(
      <FactsPanel
        details={{ ...details, area: { kind: "territories", names: ["Кокшетау", "Косшы"] } }}
        lang="ru"
        dict={ru}
      />,
    );
    expect(value("Где доступно")).toHaveTextContent("Кокшетау, Косшы");
  });

  it("is translated, including the date", () => {
    render(<FactsPanel details={details} lang="en" dict={en} />);
    expect(value("Provider")).toHaveTextContent("Водоканал Акмолы");
    expect(value("Last changed")?.textContent).toMatch(/October 15|15 October/);
    expect(value("Response time")).toHaveTextContent("up to 5 business day(s)");
  });
});
