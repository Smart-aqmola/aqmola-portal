import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Icon } from "@/shared/ui/icon/icon";
import type { SituationDetails, SituationSummary } from "../load-situation";
import type { Sector } from "../domain/types";
import { categoryIcons, situationIcons } from "./icons";
import { ServiceCard } from "./service-card";
import styles from "./situation-page.module.css";

type Labels = Dictionary["situationPage"];

/** The top of a situation page: back, the picture of the situation and its name (as on astana.kz). */
export function SituationHeader({
  lang,
  labels,
  situation,
}: {
  lang: Locale;
  labels: Labels;
  situation: Pick<SituationDetails, "id" | "name" | "summary">;
}) {
  return (
    <>
      <Link href={`/${lang}/situations`} className={styles.back}>
        <Icon name="next" size={18} className={styles.backIcon} />
        {labels.back}
      </Link>
      <header className={styles.head}>
        <span className={styles.picture} aria-hidden="true">
          <Icon name={situationIcons[situation.id]} size={56} strokeWidth={1.2} />
        </span>
        <div>
          <p className={styles.kicker}>{labels.label}</p>
          <h1 className={styles.title}>{situation.name}</h1>
          <p className={styles.summary}>{situation.summary}</p>
        </div>
      </header>
    </>
  );
}

type CategoryLink = { id: Sector | "all"; name: string; count: number; href: string };

/**
 * The categories of the situation with their counts. On a wide screen it is a list beside the
 * services; on a phone it folds into one line with the chosen category, as on the reference site.
 */
export function SituationCategories({
  labels,
  links,
  current,
}: {
  labels: Labels;
  links: CategoryLink[];
  current: Sector | "all";
}) {
  const chosen = links.find((link) => link.id === current) ?? links[0];
  const list = (
    <ul className={styles.categoryList}>
      {links.map((link) => (
        <li key={link.id}>
          <Link
            href={link.href}
            className={styles.category}
            aria-current={link.id === current ? "true" : undefined}
            scroll={false}
          >
            <Icon name={link.id === "all" ? "grid" : categoryIcons[link.id]} size={20} />
            <span className={styles.categoryName}>{link.name}</span>
            <span className={styles.categoryCount}>{link.count}</span>
            <Icon name="next" size={16} className={styles.chevron} />
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <nav aria-label={labels.categories} className={styles.categories}>
      <div className={styles.wide}>{list}</div>
      {/* A new key closes the folded list once a category is chosen. */}
      <details key={current} className={styles.fold}>
        <summary className={styles.foldSummary}>
          <Icon name={chosen.id === "all" ? "grid" : categoryIcons[chosen.id]} size={20} />
          <span className={styles.categoryName}>{chosen.name}</span>
          <span className={styles.categoryCount}>{chosen.count}</span>
          <Icon name="next" size={16} className={styles.foldChevron} />
        </summary>
        {list}
      </details>
    </nav>
  );
}

/** "Other life situations": a grid of tiles on a wide screen and a swipeable row on a phone. */
export function OtherSituations({
  lang,
  labels,
  situations,
}: {
  lang: Locale;
  labels: Labels;
  situations: SituationSummary[];
}) {
  return (
    <section className={styles.others} aria-labelledby="other-situations">
      <h2 id="other-situations" className={styles.othersTitle}>
        {labels.others}
      </h2>
      <p className={styles.othersLead}>{labels.othersLead}</p>
      <ul className={styles.tiles}>
        {situations.map((item) => (
          <li key={item.id} className={styles.tileItem}>
            <SituationTile lang={lang} labels={labels} situation={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SituationTile({
  lang,
  labels,
  situation,
}: {
  lang: Locale;
  labels: Labels;
  situation: SituationSummary;
}) {
  return (
    <Link href={`/${lang}/situations/${situation.id}`} className={styles.tile}>
      <span className={styles.tileText}>
        <span className={styles.kicker}>{labels.label}</span>
        <span className={styles.tileName}>{situation.name}</span>
        <span className={styles.tileCount}>{format(labels.count, { n: situation.count })}</span>
      </span>
      <span className={styles.tilePicture} aria-hidden="true">
        <Icon name={situationIcons[situation.id]} size={36} strokeWidth={1.2} />
      </span>
    </Link>
  );
}

/** The services of the chosen category. */
export function SituationServices({
  lang,
  dict,
  cards,
}: {
  lang: Locale;
  dict: Pick<Dictionary, "home" | "catalog" | "serviceDetails" | "situationPage">;
  cards: SituationDetails["cards"];
}) {
  if (cards.length === 0) return <p className={styles.empty}>{dict.situationPage.empty}</p>;
  return (
    <section>
      <h2 className="visually-hidden">{dict.situationPage.results}</h2>
      <p className={styles.found} role="status">
        {format(dict.situationPage.count, { n: cards.length })}
      </p>
      <ul className={styles.grid}>
        {cards.map((card) => (
          <li key={card.slug}>
            <ServiceCard
              service={card}
              lang={lang}
              labels={dict.home.service}
              favoriteLabels={dict.catalog.favorites}
              documentNames={dict.serviceDetails.documents.items}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
