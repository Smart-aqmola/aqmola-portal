import { getCatalogRepository } from "@/features/catalog/data";
import type { CatalogRepository } from "@/features/catalog/domain/repository";
import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";
import { loadOrganizationOptions } from "./load-territories";

const SAMPLES_PER_ORGANIZATION = 3;

/** Organizations for the cabinet header and a few services of each, for making test applications. */
export async function loadOperatorData(
  lang: Locale,
  catalog: CatalogRepository = getCatalogRepository(),
) {
  const [organizations, services] = await Promise.all([
    loadOrganizationOptions(lang, catalog),
    catalog.searchServices({ lang, sort: "popular", pageSize: 1000 }),
  ]);
  const sampleServices: Record<string, { slug: string; title: string }[]> = {};
  for (const service of services.items) {
    const list = (sampleServices[service.organizationId] ??= []);
    if (list.length < SAMPLES_PER_ORGANIZATION) {
      list.push({ slug: service.slug, title: localize(service.title, lang) });
    }
  }
  return { organizations, sampleServices };
}
