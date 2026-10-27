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
import { categoryIcons } from "./icons";
import type { ServiceCardData } from "./service-card-data";
import styles from "./service-card.module.css";

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
  const audience = { resident: labels.resident, business: labels.business, both: labels.both }[
    service.audience
  ];

  return (
    <Card as="article" className={styles.card}>
      <div className={styles.cover}>
        <Icon name={categoryIcons[service.categoryId]} size={56} strokeWidth={1.1} />
        <span className={styles.code}>{format(labels.code, { code: service.code })}</span>
        {service.isNew && <span className={styles.badge}>{labels.new}</span>}
        {favoriteLabels && (
          <FavoriteButton slug={service.slug} labels={favoriteLabels} className={styles.favorite} />
        )}
      </div>

      <div className={styles.head}>
        <h3 className={styles.title}>{service.title}</h3>
        {service.free ? (
          <span className={styles.free}>{labels.free}</span>
        ) : (
          service.price && (
            <span className={styles.price}>
              {format(labels.price, { n: new Intl.NumberFormat(lang).format(service.price) })}
            </span>
          )
        )}
      </div>
      <p className={styles.organization}>{service.organization}</p>

      <ul className={styles.facts}>
        <li>
          <Icon name={service.channel === "online" ? "online" : "pin"} size={18} />
          {service.channel === "online" ? labels.online : labels.visit}
        </li>
        <li>
          <Icon name="clock" size={18} />
          {format(labels.days, { n: service.workingDays })}
        </li>
        <li>
          <Icon name="user" size={18} />
          {audience}
        </li>
      </ul>

      <p className={styles.summary}>{service.summary}</p>
      {documentNames && (
        <p className={styles.docs}>
          {format(labels.documents, {
            list: service.documents.map((key) => documentNames[key]).join(", "),
          })}
        </p>
      )}

      <div className={styles.actions}>
        <Button href={orderPath(lang, service.slug)}>{labels.order}</Button>
        <Link href={base} className={styles.details}>
          {labels.details}
        </Link>
      </div>
    </Card>
  );
}
