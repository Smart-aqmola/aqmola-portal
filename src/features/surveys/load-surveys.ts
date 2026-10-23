import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";
import { getSurveyRepository } from "./data";
import type { SurveyRepository } from "./domain/repository";
import { isOpen, timeLeft } from "./domain/survey";
import { surveyCategories, type Survey, type SurveyCategory } from "./domain/types";

export type SurveyCardData = {
  id: string;
  slug: string;
  category: SurveyCategory;
  title: string;
  summary: string;
  endsOn: string;
  open: boolean;
  left: { unit: "weeks" | "days"; n: number } | null;
  participants: number;
  popular: boolean;
};

/** A survey ready for the browser: texts in one language, starting votes kept for the results. */
export type SurveyData = SurveyCardData & {
  paragraphs: string[];
  impact: string;
  minutes: number;
  questions: {
    id: string;
    kind: "single" | "multiple";
    text: string;
    options: { id: string; text: string; votes: number }[];
  }[];
};

function card(survey: Survey, lang: Locale, now: Date): SurveyCardData {
  return {
    id: survey.id,
    slug: survey.slug,
    category: survey.category,
    title: localize(survey.title, lang),
    summary: localize(survey.summary, lang),
    endsOn: survey.endsOn,
    open: isOpen(survey, now),
    left: timeLeft(survey, now),
    participants: survey.participants,
    popular: survey.popular,
  };
}

export type SurveysPage = {
  category?: SurveyCategory;
  popular: SurveyCardData[];
  open: SurveyCardData[];
  finished: SurveyCardData[];
};

/** The surveys page: popular and open ones first, the finished below; `?category=` narrows it. */
export async function loadSurveys(
  lang: Locale,
  raw: Record<string, string | string[] | undefined>,
  now: Date,
  repository: SurveyRepository = getSurveyRepository(),
): Promise<SurveysPage> {
  const value = Array.isArray(raw.category) ? raw.category[0] : raw.category;
  const category = surveyCategories.find((item) => item === value);
  const all = (await repository.listSurveys(now))
    .filter((survey) => !category || survey.category === category)
    .map((survey) => card(survey, lang, now))
    .toSorted((a, b) => a.endsOn.localeCompare(b.endsOn));
  const open = all.filter((item) => item.open);
  return {
    ...(category ? { category } : {}),
    popular: category ? [] : open.filter((item) => item.popular),
    open,
    finished: all.filter((item) => !item.open),
  };
}

/** One survey with its questions, and others to take; null when there is no such survey. */
export async function loadSurvey(
  lang: Locale,
  slug: string,
  now: Date,
  repository: SurveyRepository = getSurveyRepository(),
): Promise<{ survey: SurveyData; others: SurveyCardData[] } | null> {
  const [survey, all] = await Promise.all([
    repository.getSurvey(slug, now),
    repository.listSurveys(now),
  ]);
  if (!survey) return null;
  return {
    survey: {
      ...card(survey, lang, now),
      paragraphs: localize(survey.description, lang).split(/\n\s*\n/),
      impact: localize(survey.impact, lang),
      minutes: survey.minutes,
      questions: survey.questions.map((question) => ({
        id: question.id,
        kind: question.kind,
        text: localize(question.text, lang),
        options: question.options.map((option) => ({
          id: option.id,
          text: localize(option.text, lang),
          votes: option.votes,
        })),
      })),
    },
    others: all
      .filter((item) => item.id !== survey.id && isOpen(item, now))
      .map((item) => card(item, lang, now))
      .slice(0, 3),
  };
}
