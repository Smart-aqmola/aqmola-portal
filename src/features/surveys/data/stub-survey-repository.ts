import type { SurveyRepository } from "../domain/repository";
import type { Survey } from "../domain/types";
import { surveySeeds, type SurveySeed } from "./surveys";

const DAY = 24 * 60 * 60 * 1000;

function toSurvey(seed: SurveySeed, now: Date): Survey {
  const { endsInDays, ...rest } = seed;
  const today = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const endsOn = new Date(today.getTime() + endsInDays * DAY).toISOString().slice(0, 10);
  return { ...rest, endsOn };
}

/** Serves surveys from local test data, their ends counted from today. */
export class StubSurveyRepository implements SurveyRepository {
  async listSurveys(now: Date) {
    return surveySeeds.map((seed) => toSurvey(seed, now));
  }

  async getSurvey(slug: string, now: Date) {
    const seed = surveySeeds.find((item) => item.slug === slug);
    return seed ? toSurvey(seed, now) : null;
  }
}
