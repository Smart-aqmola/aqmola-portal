import type { Locale } from "@/shared/i18n/config";
import {
  sectors,
  situationIds,
  type Audience,
  type Sector,
  type ServiceQuery,
  type SituationId,
} from "./types";

export const MAX_QUERY_LENGTH = 100;

/** What the catalog page reads from the address: ?q=…&territory=…&for=…&situation=…&page=… */
export type CatalogParams = {
  q: string;
  territory?: string;
  audience: Audience;
  situation?: SituationId;
  category?: Sector;
  organization?: string;
  page: number;
};

export type RawParams = Record<string, string | string[] | undefined>;

type KnownIds = { territories: ReadonlySet<string>; organizations: ReadonlySet<string> };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

/** Read the address safely: unknown or broken values are dropped instead of failing the page. */
export function parseCatalogParams(raw: RawParams, known: KnownIds): CatalogParams {
  const q = (first(raw.q) ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
  const territory = first(raw.territory);
  const organization = first(raw.organization);
  const pageText = first(raw.page) ?? "";
  const page = /^\d{1,6}$/.test(pageText) ? Number(pageText) : 1;
  const situation = pick(first(raw.situation), situationIds);
  const category = pick(first(raw.category), sectors);

  return {
    q,
    ...(territory && known.territories.has(territory) ? { territory } : {}),
    audience: first(raw.for) === "business" ? "business" : "resident",
    ...(situation ? { situation } : {}),
    ...(category ? { category } : {}),
    ...(organization && known.organizations.has(organization) ? { organization } : {}),
    page: Math.max(1, page),
  };
}

/** Link to the catalog with the given filters. Defaults are left out to keep addresses short. */
export function catalogHref(lang: Locale, params: Partial<CatalogParams>): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.territory) search.set("territory", params.territory);
  if (params.audience === "business") search.set("for", "business");
  if (params.situation) search.set("situation", params.situation);
  if (params.category) search.set("category", params.category);
  if (params.organization) search.set("organization", params.organization);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const text = search.toString();
  return `/${lang}/services${text ? `?${text}` : ""}`;
}

export function toServiceQuery(
  params: CatalogParams,
  lang: Locale,
  pageSize: number,
): ServiceQuery {
  return {
    lang,
    q: params.q,
    territoryId: params.territory,
    audience: params.audience,
    situationId: params.situation,
    categoryId: params.category,
    organizationId: params.organization,
    // Without a search text, popular services come first; with one, relevance decides.
    sort: params.q === "" ? "popular" : undefined,
    page: params.page,
    pageSize,
  };
}
