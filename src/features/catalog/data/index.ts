import type { CatalogRepository } from "../domain/repository";
import { StubCatalogRepository } from "./stub-catalog-repository";

let repository: CatalogRepository | undefined;

/** The one place that decides which catalog implementation the app uses. */
export function getCatalogRepository(): CatalogRepository {
  repository ??= new StubCatalogRepository();
  return repository;
}
