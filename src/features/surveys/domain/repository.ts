import type { Survey } from "./types";

/** Surveys of residents. Test data now, an API later; `now` fixes the dates of the stub. */
export interface SurveyRepository {
  listSurveys(now: Date): Promise<Survey[]>;
  getSurvey(slug: string, now: Date): Promise<Survey | null>;
}
