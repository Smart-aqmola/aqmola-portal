import type { Locale } from "@/shared/i18n/config";
import type { Localized } from "@/shared/i18n/localized";

export type TerritoryKind = "city" | "district";

/** A city of regional significance or a district of the Akmola Region. */
export type Territory = {
  id: string;
  kind: TerritoryKind;
  name: Localized;
};

export const sectors = [
  "water",
  "heat",
  "electricity",
  "gas",
  "waste",
  "billing",
  "housing",
  "architecture",
  "business",
  "dispatch",
] as const;
export type Sector = (typeof sectors)[number];

/** A service provider. `territories` lists where it works, or "all" for the whole region. */
export type Organization = {
  id: string;
  name: Localized;
  sector: Sector;
  territories: "all" | readonly string[];
};

export const situationIds = [
  "meters",
  "connection",
  "contracts",
  "heating",
  "housing",
  "construction",
  "business",
  "appeals",
] as const;
export type SituationId = (typeof situationIds)[number];

/** A "life situation": what the person needs, not who provides it. */
export type Situation = {
  id: SituationId;
  name: Localized;
  summary: Localized;
};

export type Audience = "resident" | "business";

/** A topic of utilities or administration, used for the category filter. */
export type Category = {
  id: Sector;
  name: Localized;
};

/** "online": handled entirely online. "front-office": needs a visit or a specialist on site. */
export type ServiceChannel = "online" | "front-office";

export type Service = {
  id: string;
  slug: string;
  /** Short number visitors can search by, for example "1007". */
  code: string;
  situationId: SituationId;
  categoryId: Sector;
  organizationId: string;
  audiences: readonly Audience[];
  /** Short plain title shown on cards. */
  title: Localized;
  /** Official long name shown in the service details when it differs from the title. */
  fullTitle?: Localized;
  summary: Localized;
  free: boolean;
  /** Working days the provider needs to answer. */
  workingDays: number;
  channel: ServiceChannel;
  popular: boolean;
  isNew: boolean;
  /** ISO date, yyyy-mm-dd. */
  updatedAt: string;
};

export type ServiceQuery = {
  lang: Locale;
  q?: string;
  situationId?: SituationId;
  categoryId?: Sector;
  territoryId?: string;
  audience?: Audience;
  organizationId?: string;
  /** Only services marked as popular. */
  popular?: boolean;
  /** "popular" lists popular services before the others; the default keeps the data order. */
  sort?: "popular";
  page?: number;
  pageSize?: number;
};

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
