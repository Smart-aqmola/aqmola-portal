import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/shared/lib/money";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Icon } from "@/shared/ui/icon/icon";
import type { EventCardData } from "../load-events";
import { eventWhen, genreIcons } from "./event-texts";
import styles from "./events.module.css";

type Labels = Dictionary["eventsPage"];

/**
 * A card of the poster. "large" is the photo card of the popular row on astana.kz: the text lies
 * on the picture. The plain one has the picture on top and the facts below.
 */
export function EventCard({
  event,
  lang,
  labels,
  large = false,
}: {
  event: EventCardData;
  lang: Locale;
  labels: Labels;
  large?: boolean;
}) {
  return (
    <article className={large ? styles.large : styles.card}>
      <div className={styles.cover} data-genre={event.genre}>
        {event.photo ? (
          <Image
            src={event.photo.url}
            alt={event.photo.alt}
            fill
            sizes={large ? "(max-width: 700px) 85vw, 400px" : "(max-width: 700px) 100vw, 33vw"}
            className={styles.photo}
          />
        ) : (
          <Icon name={genreIcons[event.genre]} size={large ? 72 : 48} strokeWidth={1.2} />
        )}
        <span className={styles.age}>{event.age}</span>
      </div>
      <div className={styles.body}>
        <p className={styles.genre}>{labels.genres[event.genre]}</p>
        <h3 className={styles.title}>
          <Link href={`/${lang}/events/${event.slug}`} className={styles.link}>
            {event.title}
          </Link>
        </h3>
        {large && <p className={styles.summary}>{event.summary}</p>}
        <p className={styles.when}>
          <Icon name="calendar" size={16} />
          {eventWhen(event.startsAt, lang)}
        </p>
        <p className={styles.venue}>
          <Icon name="pin" size={16} />
          {event.venue}
        </p>
        <p className={styles.price}>
          {event.price === null ? labels.free : formatMoney(event.price)}
        </p>
      </div>
    </article>
  );
}
