import type { SurveyRepository } from "../domain/repository";
import { StubSurveyRepository } from "./stub-survey-repository";

let repository: SurveyRepository | undefined;

/** The one place that decides which implementation of the surveys the app uses. */
export function getSurveyRepository(): SurveyRepository {
  repository ??= new StubSurveyRepository();
  return repository;
}
