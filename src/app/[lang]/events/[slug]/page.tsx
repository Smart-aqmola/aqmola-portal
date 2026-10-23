import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatMoney } from "@/features/billing/domain/money";
import { loadEvent } from "@/features/events/load-events";
import { EventActions } from "@/features/events/ui/event-actions";
import { EventCard } from "@/features/events/ui/event-card";
import { eventWhen, genreIcons } from "@/features/events/ui/event-texts";
import styles from "@/features/events/ui/events.module.css";
import { hasLocale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs/breadcrumbs";
import { Icon } from "@/shared/ui/icon/icon";
import { PhotoCredits } from "@/shared/ui/photo-credits/photo-credits";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";
import page from "@/shared/styles/page.module.css";

type Props = PageProps<"/[lang]/events/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const [dict, event] = await Promise.all([
    getDictionary(lang),
    loadEvent(lang, slug, new Date(0)),
  ]);
  if (!event) return {};
  return {
    title: `${event.card.title} — ${dict.eventsPage.title} — ${dict.brand.name}`,
    description: event.card.summary,
  };
}

export default function EventPage({ params }: Props) {
  return (
    <div className={`container ${page.page}`}>
      {/* The date is counted from today, so the page is made at request time. */}
      <Suspense fallback={<PageSkeleton blocks={3} />}>
        <Event params={params} />
      </Suspense>
    </div>
  );
}

async function Event({ params }: { params: Props["params"] }) {
  await connection();
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, event] = await Promise.all([getDictionary(lang), loadEvent(lang, slug, new Date())]);
  if (!event) notFound();
  const t = dict.eventsPage;
  const { card } = event;
  const when = eventWhen(card.startsAt, lang);

  return (
    <>
      <Breadcrumbs
        label={t.breadcrumbs}
        items={[
          { label: dict.nav.home, href: `/${lang}` },
          { label: t.title, href: `/${lang}/events` },
          { label: card.title },
        ]}
      />
      <section className={styles.hero}>
        {card.photo ? (
          <Image
            src={card.photo.url}
            alt={card.photo.alt}
            fill
            priority
            sizes="100vw"
            className={styles.photo}
          />
        ) : (
          <Icon
            name={genreIcons[card.genre]}
            size={140}
            strokeWidth={1}
            className={styles.heroIcon}
          />
        )}
        <div className={styles.heroText}>
          <span className={styles.age}>{card.age}</span>
          <p className={styles.genre}>{t.genres[card.genre]}</p>
          <h1 className={styles.heroTitle}>{card.title}</h1>
          <p className={styles.heroMeta}>
            {when} · {event.venue.name}
          </p>
          <EventActions
            event={{
              id: event.id,
              slug: card.slug,
              startsAt: card.startsAt,
              durationMinutes: event.durationMinutes,
            }}
            text={{
              title: card.title,
              place: `${event.venue.name}, ${event.venue.address}`,
              description: card.summary,
            }}
            labels={t}
          />
        </div>
      </section>

      <div className={styles.details}>
        <section className={styles.text} aria-labelledby="about">
          <h2 id="about" className={styles.sectionTitle}>
            {t.about}
          </h2>
          {event.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </section>
        <dl className={styles.facts}>
          <div>
            <dt>{t.place}</dt>
            <dd>
              <Link href={`/${lang}/events?venue=${event.venue.id}`}>{event.venue.name}</Link>
            </dd>
          </div>
          <div>
            <dt>{t.address}</dt>
            <dd>{event.venue.address}</dd>
          </div>
          <div>
            <dt>{t.date}</dt>
            <dd>{when}</dd>
          </div>
          <div>
            <dt>{t.duration}</dt>
            <dd>{format(t.minutes, { n: event.durationMinutes })}</dd>
          </div>
          <div>
            <dt>{t.genre}</dt>
            <dd>{t.genres[card.genre]}</dd>
          </div>
          <div>
            <dt>{t.age}</dt>
            <dd>{card.age}</dd>
          </div>
          <div>
            <dt>{t.cost}</dt>
            <dd>{card.price === null ? t.freeEntry : formatMoney(card.price)}</dd>
          </div>
          {event.note && (
            <div>
              <dt>{t.note}</dt>
              <dd>{event.note}</dd>
            </div>
          )}
        </dl>
      </div>

      {event.related.length > 0 && (
        <section className={styles.section} aria-labelledby="others">
          <h2 id="others" className={styles.sectionTitle}>
            {t.others}
          </h2>
          <ul className={styles.grid}>
            {event.related.map((item) => (
              <li key={item.slug}>
                <EventCard event={item} lang={lang} labels={t} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {event.credit && (
        <div className={styles.section}>
          <PhotoCredits label={dict.home.credits.label} credits={[event.credit]} />
        </div>
      )}
    </>
  );
}
