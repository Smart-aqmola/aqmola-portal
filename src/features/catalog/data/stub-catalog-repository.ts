import {
  countByCategory,
  countBySituation,
  organizationServes,
  queryServices,
} from "../domain/query-services";
import type { CatalogData } from "../domain/query-services";
import type { CatalogRepository } from "../domain/repository";
import type { Category, Situation } from "../domain/types";
import { categories } from "./categories";
import { organizations } from "./organizations";
import { services } from "./services";
import { situations } from "./situations";
import { territories } from "./territories";

/** Serves the catalog from local test data. Methods are async to match a future API client. */
export class StubCatalogRepository implements CatalogRepository {
  constructor(
    private readonly data: CatalogData = { territories, organizations, services },
    private readonly situationList: readonly Situation[] = situations,
    private readonly categoryList: readonly Category[] = categories,
  ) {}

  async listTerritories() {
    return [...this.data.territories];
  }

  async listSituations() {
    return [...this.situationList];
  }

  async listCategories() {
    return [...this.categoryList];
  }

  async listOrganizations(territoryId?: string) {
    return this.data.organizations.filter(
      (organization) => !territoryId || organizationServes(organization, territoryId),
    );
  }

  async searchServices(query: Parameters<CatalogRepository["searchServices"]>[0]) {
    return queryServices(this.data, query);
  }

  async getService(slug: string) {
    return this.data.services.find((service) => service.slug === slug) ?? null;
  }

  async countServicesBySituation(territoryId?: string) {
    return countBySituation(this.data, territoryId);
  }

  async countServicesByCategory(territoryId?: string) {
    return countByCategory(this.data, territoryId);
  }
}
