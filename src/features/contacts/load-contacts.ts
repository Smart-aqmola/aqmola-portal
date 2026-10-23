import { getCatalogRepository } from "@/features/catalog/data";
import type { CatalogRepository } from "@/features/catalog/domain/repository";
import type { Sector } from "@/features/catalog/domain/types";
import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";
import { operator, providerContacts } from "./data/contacts";

export type OperatorContacts = {
  name: string;
  phones: string[];
  email: string;
  address: string;
  hours: string;
  mapHref: string;
};

export type ProviderContact = {
  id: string;
  name: string;
  sector: Sector;
  phone: string;
  email: string;
  hours: string;
};

/** The operator of the portal, as the contact block on the home page shows it. */
export function loadOperator(lang: Locale): OperatorContacts {
  const { lat, lon } = operator.coordinates;
  return {
    name: localize(operator.name, lang),
    phones: operator.phones,
    email: operator.email,
    address: localize(operator.address, lang),
    hours: localize(operator.hours, lang),
    mapHref: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`,
  };
}

/** The service desks of the utility providers, for the contacts page. */
export async function loadProviderContacts(
  lang: Locale,
  catalog: CatalogRepository = getCatalogRepository(),
): Promise<ProviderContact[]> {
  const organizations = await catalog.listOrganizations();
  return organizations.flatMap((item) => {
    const contact = providerContacts[item.id];
    if (!contact) return [];
    return [
      {
        id: item.id,
        name: localize(item.name, lang),
        sector: item.sector,
        phone: contact.phone,
        email: contact.email,
        hours: localize(contact.hours, lang),
      },
    ];
  });
}
