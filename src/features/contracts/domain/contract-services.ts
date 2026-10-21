import type { ContractSector } from "@/features/account/domain/availability";

/**
 * The services of the catalog that are contracts with a utility provider. Ordering them leads to
 * the contract wizard instead of the plain demo application (spec 4). Waste removal has two,
 * because the city and the districts are served by different companies.
 */
export const CONTRACT_SERVICES: readonly {
  slug: string;
  sector: ContractSector;
  providerId: string;
}[] = [
  {
    slug: "electricity-contract-resident",
    sector: "electricity",
    providerId: "akmola-energy-sales",
  },
  { slug: "water-contract-resident", sector: "water", providerId: "akmola-water" },
  { slug: "heat-contract", sector: "heat", providerId: "akmola-heat" },
  { slug: "gas-contract", sector: "gas", providerId: "akmola-gas" },
  { slug: "waste-contract-kokshetau", sector: "waste", providerId: "kokshetau-eco" },
  { slug: "waste-contract-region", sector: "waste", providerId: "region-eco" },
];

export function contractServiceBySlug(slug: string) {
  return CONTRACT_SERVICES.find((item) => item.slug === slug);
}

/** The catalog service that stands for this utility and provider, or the first one of the utility. */
export function serviceSlugFor(sector: ContractSector, providerId: string): string {
  const exact = CONTRACT_SERVICES.find(
    (item) => item.sector === sector && item.providerId === providerId,
  );
  const first = CONTRACT_SERVICES.find((item) => item.sector === sector);
  return (exact ?? first)?.slug ?? sector;
}

/** Where "Order the service" leads: a contract goes to the wizard, anything else to the application. */
export function orderPath(lang: string, slug: string): string {
  return contractServiceBySlug(slug)
    ? `/${lang}/contracts/new?service=${slug}`
    : `/${lang}/services/${slug}/apply`;
}
