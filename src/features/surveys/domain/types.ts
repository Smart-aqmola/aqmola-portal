import type { Localized } from "@/shared/i18n/localized";

export const surveyCategories = ["utilities", "city", "ecology", "digital", "tourism"] as const;
export type SurveyCategory = (typeof surveyCategories)[number];

export type SurveyQuestion = {
  id: string;
  /** One answer or several. */
  kind: "single" | "multiple";
  text: Localized;
  options: {
    id: string;
    text: Localized;
    /** Votes before this browser; the demo starts from them. */ votes: number;
  }[];
};

/** A survey of residents (as on astana.kz/surveys). */
export type Survey = {
  id: string;
  slug: string;
  category: SurveyCategory;
  title: Localized;
  summary: Localized;
  description: Localized;
  /** How the results will be used ("Results and impact"). */
  impact: Localized;
  /** End of the survey, yyyy-mm-dd, inclusive. */
  endsOn: string;
  minutes: number;
  participants: number;
  popular: boolean;
  questions: SurveyQuestion[];
};

/** The answers of this browser: question id -> chosen option ids. */
export type SurveyAnswers = Record<string, string[]>;

export type SurveyVote = { surveyId: string; answers: SurveyAnswers; at: string };
