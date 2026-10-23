import { isText, parseList } from "@/shared/lib/stored-data";
import type { Survey, SurveyAnswers, SurveyVote } from "./types";

/** What counting needs from a question: no texts, so it works on translated copies too. */
type Countable = {
  questions: readonly {
    id: string;
    kind: "single" | "multiple";
    options: readonly { id: string; votes: number }[];
  }[];
};

export const VOTES_KEY = "aqmola:survey-votes";
export const MAX_VOTES = 100;
const DAY = 24 * 60 * 60 * 1000;

/** Today in Kazakhstan (UTC+5), yyyy-mm-dd. */
const todayIn = (now: Date) =>
  new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function isOpen(survey: Pick<Survey, "endsOn">, now: Date): boolean {
  return survey.endsOn >= todayIn(now);
}

/** "Until the end": whole weeks when it is far, days when it is near, nothing when it is over. */
export function timeLeft(
  survey: Pick<Survey, "endsOn">,
  now: Date,
): { unit: "weeks" | "days"; n: number } | null {
  if (!isOpen(survey, now)) return null;
  const days =
    Math.round(
      (Date.parse(`${survey.endsOn}T00:00:00Z`) - Date.parse(`${todayIn(now)}T00:00:00Z`)) / DAY,
    ) + 1;
  return days >= 14 ? { unit: "weeks", n: Math.floor(days / 7) } : { unit: "days", n: days };
}

/** The questions left without an answer, in order; empty when the form can be sent. */
export function unanswered(survey: Countable, answers: SurveyAnswers): string[] {
  return survey.questions
    .filter((question) => {
      const chosen = answers[question.id] ?? [];
      const known = chosen.filter((id) => question.options.some((option) => option.id === id));
      if (known.length === 0) return true;
      return question.kind === "single" && known.length > 1;
    })
    .map((question) => question.id);
}

export type QuestionResult = {
  id: string;
  total: number;
  options: { id: string; votes: number; percent: number; mine: boolean }[];
};

/**
 * The results with this browser's vote added. Percentages are whole and add up to 100 for a single
 * choice (the largest remainders get the rounding), so the bars never claim 99 or 101 %.
 */
export function results(survey: Countable, mine?: SurveyAnswers): QuestionResult[] {
  return survey.questions.map((question) => {
    const chosen = new Set(mine?.[question.id] ?? []);
    const votes = question.options.map((option) => option.votes + (chosen.has(option.id) ? 1 : 0));
    const sum = votes.reduce((total, n) => total + n, 0);
    const exact = votes.map((n) => (sum === 0 ? 0 : (n / sum) * 100));
    const percent = exact.map(Math.floor);
    if (question.kind === "single" && sum > 0) {
      let rest = 100 - percent.reduce((total, n) => total + n, 0);
      const order = exact
        .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
        .sort((a, b) => b.remainder - a.remainder);
      for (const { index } of order) {
        if (rest <= 0) break;
        percent[index] += 1;
        rest -= 1;
      }
    }
    return {
      id: question.id,
      total: sum,
      options: question.options.map((option, index) => ({
        id: option.id,
        votes: votes[index],
        percent: percent[index],
        mine: chosen.has(option.id),
      })),
    };
  });
}

function isVote(value: unknown): value is SurveyVote {
  if (typeof value !== "object" || value === null) return false;
  const vote = value as Record<string, unknown>;
  if (!isText(vote.surveyId, 60) || !isText(vote.at, 40)) return false;
  const answers = vote.answers;
  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) return false;
  return Object.values(answers).every(
    (list) => Array.isArray(list) && list.length <= 20 && list.every((id) => isText(id, 60)),
  );
}

export function parseVotes(raw: string | null): SurveyVote[] {
  return parseList(raw, isVote, MAX_VOTES);
}
