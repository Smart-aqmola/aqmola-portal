import Image from "next/image";
import Link from "next/link";
import type { PlaceFact } from "@/features/content/domain/types";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Card } from "@/shared/ui/card/card";
import { Icon, type IconName } from "@/shared/ui/icon/icon";
import styles from "./places-grid.module.css";

/** A place card for the tourism section; not on the home page for now. */
export type HomePlace = {
  slug: string;
  name: string;
  summary: string;
  territory: string;
  facts: readonly PlaceFact[];
  photo: { url: string; alt: string };
};

const factIcons: Record<PlaceFact, IconName> = {
  nature: "tree",
  lake: "water",
  reserve: "tree",
  museum: "house",
  city: "house",
  rest: "bed",
};

type PlacesGridProps = {
  lang: Locale;
  /** Without a title the grid has no heading row (used on the tourism page, which has its own). */
  title?: string;
  allLabel?: string;
  factLabels: Dictionary["home"]["tourism"]["facts"];
  places: HomePlace[];
  /** Fetch the photo of the first place before the others; for a grid at the top of a page. */
  priorityFirst?: boolean;
};

export function PlacesGrid({
  lang,
  title,
  allLabel,
  factLabels,
  places,
  priorityFirst,
}: PlacesGridProps) {
  // Under the section's own h2 the cards are h3; on the tourism page they come right after the h1.
  const hasHead = Boolean(title && allLabel);
  const Name = hasHead ? "h3" : "h2";
  return (
    <section>
      {hasHead && (
        <div className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          <Link href={`/${lang}/tourism`} className={styles.all}>
            {allLabel}
          </Link>
        </div>
      )}
      <ul className={styles.grid}>
        {places.map((place, index) => (
          <li key={place.slug}>
            <Card as="article" className={styles.card}>
              <div className={styles.photo}>
                <Image
                  src={place.photo.url}
                  alt={place.photo.alt}
                  fill
                  sizes="(max-width: 600px) 100vw, (max-width: 1150px) 50vw, 25vw"
                  loading={priorityFirst && index === 0 ? "eager" : undefined}
                  fetchPriority={priorityFirst && index === 0 ? "high" : undefined}
                />
              </div>
              <Name className={styles.name}>
                <Link href={`/${lang}/tourism/${place.slug}`} className={styles.link}>
                  {place.name}
                </Link>
              </Name>
              <p className={styles.territory}>{place.territory}</p>
              <p className={styles.summary}>{place.summary}</p>
              <ul className={styles.facts}>
                {place.facts.slice(0, 3).map((fact) => (
                  <li key={fact}>
                    <Icon name={factIcons[fact]} size={20} />
                    {factLabels[fact]}
                  </li>
                ))}
              </ul>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
