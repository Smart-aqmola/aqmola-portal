import type { ContentRepository } from "../domain/repository";
import { StubContentRepository } from "./stub-content-repository";

let repository: ContentRepository | undefined;

/** The one place that decides which content implementation the app uses. */
export function getContentRepository(): ContentRepository {
  repository ??= new StubContentRepository();
  return repository;
}
