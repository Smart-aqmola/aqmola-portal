import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { format } from "@/shared/i18n/format";
import { Button } from "@/shared/ui/button/button";
import { Card } from "@/shared/ui/card/card";
import { Icon } from "@/shared/ui/icon/icon";
import { FavoriteButton, type FavoriteLabels } from "@/features/favorites/ui/favorite-button";
import { orderPath } from "@/features/catalog/domain/contract-services";
import type { DocumentKey } from "../domain/service-details";
import type { Sector } from "../domain/types";
import { categoryIcons } from "./icons";
import type { ServiceCardData } from "./service-card-data";
import styles from "./service-card.module.css";

/** The utility sectors whose cards wear their own tint; the rest stay on the plain surface. */
const TINTED: ReadonlySet<Sector> = new Set(["water", "heat", "electricity", "gas", "waste"]);

type ServiceCardProps = {
  service: ServiceCardData;
  lang: Locale;
  labels: Dictionary["home"]["service"];
  /** Shows the heart that saves the service in this browser when given. */
  favoriteLabels?: FavoriteLabels;
  /** Names of the documents; the card lists what to prepare when given (spec 1.3). */
  documentNames?: Record<DocumentKey, string>;
};

export function ServiceCard({
  service,
  lang,
  labels,
  favoriteLabels,
  documentNames,
}: ServiceCardProps) {
  const base = `/${lang}/services/${service.slug}`;
  const cost = service.free
    ? labels.free
    : service.price &&
      format(labels.price, { n: new Intl.NumberFormat(lang).format(service.price) });
  const documents =
    documentNames &&
    format(labels.documents, {
      list: service.documents.map((key) => documentNames[key]).join(", "),
    });

  const tinted = TINTED.has(service.categoryId);

  return (
    <Card
      as="article"
      className={tinted ? `${styles.card} ${styles[service.categoryId]}` : styles.card}
    >
      {tinted && (
        <span className={styles.mark} aria-hidden="true">
          <Icon name={categoryIcons[service.categoryId]} size={112} />
        </span>
      )}
      {cost && <span className={styles.tag}>{cost}</span>}

      <div className={styles.top}>
        <span className={styles.icon} aria-hidden="true">
          <Icon name={categoryIcons[service.categoryId]} size={22} />
        </span>
        {favoriteLabels && (
          <FavoriteButton slug={service.slug} labels={favoriteLabels} className={styles.favorite} />
        )}
      </div>

      <div className={styles.head}>
        <h3 className={styles.title}>{service.title}</h3>
        <p className={styles.organization}>{service.organization}</p>
      </div>

      <p className={styles.summary}>{service.summary}</p>

      <ul className={styles.facts}>
        {service.isNew && <li className={styles.badge}>{labels.new}</li>}
        <li>{service.channel === "online" ? labels.online : labels.visit}</li>
        <li>{format(labels.days, { n: service.workingDays })}</li>
        <li>{format(labels.code, { code: service.code })}</li>
      </ul>

      {documents && (
        <p className={styles.docs} title={documents}>
          {documents}
        </p>
      )}

      <div className={styles.actions}>
        <Button href={orderPath(lang, service.slug)}>{labels.order}</Button>
        <Link href={base} className={styles.details}>
          {labels.details}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Card>
  );
}
