import Link from "next/link";
import { ServiceCard } from "@/features/catalog/ui/service-card";
import type { ServiceCardData } from "@/features/catalog/ui/service-card-data";
import type { FavoriteLabels } from "@/features/favorites/ui/favorite-button";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import styles from "./utility-services.module.css";

type UtilityServicesProps = {
  lang: Locale;
  labels: Dictionary["home"]["utility"];
  services: ServiceCardData[];
  serviceLabels: Dictionary["home"]["service"];
  favoriteLabels: FavoriteLabels;
  documentNames: Dictionary["serviceDetails"]["documents"]["items"];
};

/** The utility services named in the specification (1.2), each with everything 1.3 asks for. */
export function UtilityServices({
  lang,
  labels,
  services,
  serviceLabels,
  favoriteLabels,
  documentNames,
}: UtilityServicesProps) {
  return (
    <section aria-labelledby="utility-title">
      <h2 id="utility-title" className={styles.title}>
        {labels.title}
      </h2>
      <p className={styles.lead}>{labels.lead}</p>
      <ul className={styles.grid}>
        {services.map((service) => (
          <li key={service.slug}>
            <ServiceCard
              service={service}
              lang={lang}
              labels={serviceLabels}
              favoriteLabels={favoriteLabels}
              documentNames={documentNames}
            />
          </li>
        ))}
      </ul>
      <Link href={`/${lang}/services`} className={styles.all}>
        {labels.all}
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
