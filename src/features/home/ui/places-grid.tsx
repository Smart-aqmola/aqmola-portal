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
};

export function PlacesGrid({ lang, title, allLabel, factLabels, places }: PlacesGridProps) {
  return (
    <section>
      {title && allLabel && (
        <div className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          <Link href={`/${lang}/tourism`} className={styles.all}>
            {allLabel}
          </Link>
        </div>
      )}
      <ul className={styles.grid}>
        {places.map((place) => (
          <li key={place.slug}>
            <Card as="article" className={styles.card}>
              <div className={styles.photo}>
                <Image
                  src={place.photo.url}
                  alt={place.photo.alt}
                  fill
                  sizes="(max-width: 600px) 100vw, (max-width: 1150px) 50vw, 25vw"
                />
              </div>
              <h3 className={styles.name}>
                <Link href={`/${lang}/tourism/${place.slug}`} className={styles.link}>
                  {place.name}
                </Link>
              </h3>
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
