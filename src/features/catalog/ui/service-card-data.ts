import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";
import type { Audience, Sector, Service, SituationId } from "../domain/types";

/** Everything a service card shows, already localized, so the card needs no repository. */
export type ServiceCardData = {
  slug: string;
  code: string;
  title: string;
  summary: string;
  organization: string;
  categoryId: Sector;
  situationId: SituationId;
  free: boolean;
  workingDays: number;
  channel: Service["channel"];
  audience: Audience | "both";
  popular: boolean;
  isNew: boolean;
};

/** Turn a catalog service into what a card shows, in the visitor's language. */
export function toServiceCardData(
  service: Service,
  organizationName: string,
  lang: Locale,
): ServiceCardData {
  return {
    slug: service.slug,
    code: service.code,
    title: localize(service.title, lang),
    summary: localize(service.summary, lang),
    organization: organizationName,
    categoryId: service.categoryId,
    situationId: service.situationId,
    free: service.free,
    workingDays: service.workingDays,
    channel: service.channel,
    audience: service.audiences.length > 1 ? "both" : service.audiences[0],
    popular: service.popular,
    isNew: service.isNew,
  };
}
