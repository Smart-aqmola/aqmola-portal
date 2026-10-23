import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { eventGenres } from "@/features/events/domain/types";
import { loadPoster, type EventCardData } from "@/features/events/load-events";
import { EventCard } from "@/features/events/ui/event-card";
import { genreIcons } from "@/features/events/ui/event-texts";
import styles from "@/features/events/ui/events.module.css";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { hasLocale } from "@/shared/i18n/config";
import { getDictionary, type Dictionary } from "@/shared/i18n/get-dictionary";
import { Icon } from "@/shared/ui/icon/icon";
import { PhotoCredits } from "@/shared/ui/photo-credits/photo-credits";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";
import page from "@/shared/styles/page.module.css";

type Props = PageProps<"/[lang]/events">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: `${dict.eventsPage.title} — ${dict.brand.name}`,
    description: dict.eventsPage.lead,
  };
}

export default function EventsPage({ params, searchParams }: Props) {
  return (
    <div className={`container ${page.page}`}>
      {/* What is upcoming depends on today and on the address, so the page streams in. */}
      <Suspense fallback={<PageSkeleton blocks={3} />}>
        <Poster params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function Cards({
  items,
  lang,
  labels,
}: {
  items: EventCardData[];
  lang: Locale;
  labels: Dictionary["eventsPage"];
}) {
  return (
    <ul className={styles.grid}>
      {items.map((event) => (
        <li key={event.slug}>
          <EventCard event={event} lang={lang} labels={labels} />
        </li>
      ))}
    </ul>
  );
}

async function Poster({
  params,
  searchParams,
}: {
  params: Props["params"];
  searchParams: Props["searchParams"];
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const query = await searchParams;
  const [dict, data] = await Promise.all([
    getDictionary(lang),
    loadPoster(lang, query, new Date()),
  ]);
  const t = dict.eventsPage;
  const base = `/${lang}/events`;
  const venueName = data.venues.find((venue) => venue.id === data.params.venueId)?.name;

  return (
    <>
      <h1 className={page.title}>{t.title}</h1>
      <p className={page.lead}>{t.lead}</p>
      <p className={styles.demo}>{t.demo}</p>

      <nav aria-label={t.genresLabel}>
        <ul className={styles.chips}>
          <li>
            <Link
              href={base}
              className={styles.chip}
              aria-current={data.filtered ? undefined : "page"}
            >
              {t.all}
            </Link>
          </li>
          {eventGenres.map((genre) => (
            <li key={genre}>
              <Link
                href={`${base}?genre=${genre}`}
                className={styles.chip}
                aria-current={data.params.genre === genre ? "page" : undefined}
              >
                <Icon name={genreIcons[genre]} size={18} />
                {t.genres[genre]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {data.filtered ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              {venueName
                ? format(t.venueEvents, { name: venueName })
                : data.params.genre
                  ? t.genres[data.params.genre]
                  : t.allEvents}
            </h2>
            <Link href={base} className={styles.sectionLink}>
              {t.reset}
            </Link>
          </div>
          <p className={styles.demo} role="status">
            {format(t.count, { n: data.filtered.length })}
          </p>
          {data.filtered.length === 0 ? (
            <p className={styles.empty}>{t.empty}</p>
          ) : (
            <Cards items={data.filtered} lang={lang} labels={t} />
          )}
        </section>
      ) : (
        <>
          <section className={styles.section} aria-labelledby="popular">
            <h2 id="popular" className={styles.sectionTitle}>
              <Icon name="bolt" size={22} />
              {t.popular}
            </h2>
            <ul className={styles.row}>
              {data.popular.map((event) => (
                <li key={event.slug}>
                  <EventCard event={event} lang={lang} labels={t} large />
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="weekend">
            <h2 id="weekend" className={styles.sectionTitle}>
              {t.weekend}
            </h2>
            {data.weekend.length === 0 ? (
              <p className={styles.empty}>{t.weekendEmpty}</p>
            ) : (
              <Cards items={data.weekend} lang={lang} labels={t} />
            )}
          </section>

          <section className={styles.section} aria-labelledby="venues">
            <h2 id="venues" className={styles.sectionTitle}>
              {t.venues}
            </h2>
            <ul className={styles.venues}>
              {data.venues.map((venue) => (
                <li key={venue.id}>
                  <Link href={`${base}?venue=${venue.id}`} className={styles.venueTile}>
                    {venue.photo && (
                      <Image
                        src={venue.photo.url}
                        alt=""
                        fill
                        sizes="(max-width: 700px) 100vw, 33vw"
                        className={styles.photo}
                      />
                    )}
                    <span>{venue.name}</span>
                    <span className={styles.venueAddress}>{venue.address}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="free">
            <h2 id="free" className={styles.sectionTitle}>
              {t.free}
            </h2>
            <Cards items={data.free} lang={lang} labels={t} />
          </section>

          <section className={styles.section} aria-labelledby="all-events">
            <h2 id="all-events" className={styles.sectionTitle}>
              {t.allEvents}
            </h2>
            <Cards items={data.all} lang={lang} labels={t} />
          </section>
        </>
      )}

      <div className={styles.section}>
        <PhotoCredits label={dict.home.credits.label} credits={data.credits} />
      </div>
    </>
  );
}
