import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { format } from "@/shared/i18n/format";
import type { CatalogData } from "../load-catalog";
import { ServiceCard } from "./service-card";
import styles from "./catalog-results.module.css";

type CatalogResultsProps = {
  lang: Locale;
  dict: Pick<Dictionary, "catalog" | "home" | "serviceDetails">;
  data: Pick<CatalogData, "cards" | "total">;
};

export function CatalogResults({ lang, dict, data }: CatalogResultsProps) {
  const { results, favorites } = dict.catalog;

  return (
    <section>
      <p className={styles.count} role="status">
        {format(results.found, { n: data.total })}
      </p>

      {data.cards.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>{results.empty}</h2>
          <p>{results.emptyHint}</p>
          <Link href={`/${lang}/services`} className={styles.reset}>
            {dict.catalog.filters.reset}
          </Link>
        </div>
      ) : (
        <>
          <h2 className="visually-hidden">{results.heading}</h2>
          <ul className={styles.grid}>
            {data.cards.map((card) => (
              <li key={card.slug}>
                <ServiceCard
                  service={card}
                  lang={lang}
                  labels={dict.home.service}
                  favoriteLabels={favorites}
                  documentNames={dict.serviceDetails.documents.items}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
