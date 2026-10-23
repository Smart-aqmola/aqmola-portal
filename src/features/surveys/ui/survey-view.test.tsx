import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { loadSurvey } from "../load-surveys";
import { SurveyView } from "./survey-view";

const now = new Date("2026-10-23T06:00:00Z");

async function surveyOf(slug: string) {
  const data = await loadSurvey("ru", slug, now);
  if (!data) throw new Error(slug);
  return data.survey;
}

describe("SurveyView", () => {
  beforeEach(() => window.localStorage.clear());

  it("asks for every answer, counts the vote once and shows the results with it", async () => {
    render(
      <SurveyView survey={await surveyOf("heating-season")} lang="ru" labels={ru.surveysPage} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Приступить" }));
    fireEvent.click(screen.getByRole("button", { name: "Отправить ответ" }));
    expect(screen.getAllByText("Ответьте на этот вопрос")).toHaveLength(2);

    fireEvent.click(screen.getByRole("radio", { name: "Да, в срок" }));
    fireEvent.click(screen.getByRole("radio", { name: "Тепло" }));
    fireEvent.click(screen.getByRole("button", { name: "Отправить ответ" }));

    expect(screen.getByRole("tab", { name: "Результаты и влияние" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getAllByText(/ваш ответ/)).toHaveLength(2);
    expect(screen.getByText("Вы уже прошли этот опрос")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Приступить" })).toBeNull();
    expect(screen.getByText("1285")).toBeInTheDocument();
  });

  it("shows the results of a finished survey to everyone and does not let it be taken", async () => {
    render(
      <SurveyView survey={await surveyOf("burabay-trip")} lang="ru" labels={ru.surveysPage} />,
    );
    expect(screen.queryByRole("button", { name: "Приступить" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Результаты и влияние" }));
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("moves between the tabs with the arrow keys", async () => {
    render(
      <SurveyView survey={await surveyOf("waste-sorting")} lang="ru" labels={ru.surveysPage} />,
    );
    const about = screen.getByRole("tab", { name: "О задании" });
    fireEvent.keyDown(about, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Условия участия" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText(/Пройти можно один раз/)).toBeInTheDocument();
  });
});
