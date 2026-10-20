import type {
  Category,
  Organization,
  Page,
  Sector,
  Service,
  ServiceQuery,
  Situation,
  SituationId,
  Territory,
} from "./types";

/**
 * Everything the UI needs from the catalog. The stub implementation reads local data;
 * a future implementation will call the real API without changing any page.
 */
export interface CatalogRepository {
  listTerritories(): Promise<Territory[]>;
  listSituations(): Promise<Situation[]>;
  listCategories(): Promise<Category[]>;
  listOrganizations(territoryId?: string): Promise<Organization[]>;
  searchServices(query: ServiceQuery): Promise<Page<Service>>;
  getService(slug: string): Promise<Service | null>;
  countServicesBySituation(territoryId?: string): Promise<Record<SituationId, number>>;
  countServicesByCategory(territoryId?: string): Promise<Record<Sector, number>>;
}
