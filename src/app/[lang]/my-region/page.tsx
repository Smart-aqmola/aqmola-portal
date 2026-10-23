import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventCard } from "@/features/events/ui/event-card";
import eventStyles from "@/features/events/ui/events.module.css";
import { eventWhen } from "@/features/events/ui/event-texts";
import { loadMyRegion } from "@/features/region/load-my-region";
import { PhotoOfDay } from "@/features/region/ui/photo-of-day";
import styles from "@/features/region/ui/my-region.module.css";
import { hasLocale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { Icon } from "@/shared/ui/icon/icon";
import { PhotoCredits } from "@/shared/ui/photo-credits/photo-credits";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";
import page from "@/shared/styles/page.module.css";

type Props = PageProps<"/[lang]/my-region">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.myRegionPage.title} — ${dict.brand.name}` };
}

export default function MyRegionPage({ params }: Props) {
  return (
    <div className={`container ${page.page}`}>
      {/* The panel is about today, so it is made at request time. */}
      <Suspense fallback={<PageSkeleton blocks={4} />}>
        <Panel params={params} />
      </Suspense>
    </div>
  );
}

async function Panel({ params }: { params: Props["params"] }) {
  await connection();
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, data] = await Promise.all([getDictionary(lang), loadMyRegion(lang, new Date())]);
  const t = dict.myRegionPage;
  const news = data.news[0];

  return (
    <>
      <h1 className="visually-hidden">{t.title}</h1>
      <div className={styles.top}>
        <div className={styles.left}>
          <section className={styles.intro}>
            <h2 className={styles.introTitle}>{t.heroTitle}</h2>
            <p className={styles.introText}>{t.heroText}</p>
            <Link href={`/${lang}/services`} className={styles.introLink}>
              {t.heroLink}
              <Icon name="next" size={18} />
            </Link>
          </section>
          <div className={styles.pair}>
            {data.event && (
              <Link href={`/${lang}/events/${data.event.slug}`} className={styles.mini}>
                {data.event.photo && (
                  <Image
                    src={data.event.photo.url}
                    alt=""
                    fill
                    sizes="(max-width: 900px) 50vw, 25vw"
                    className={styles.photo}
                  />
                )}
                <span className={styles.miniTag}>{t.eventTag}</span>
                <span className={styles.miniTitle}>{data.event.title}</span>
                <span className={styles.miniMeta}>
                  <Icon name="calendar" size={14} />
                  {eventWhen(data.event.startsAt, lang)}
                </span>
              </Link>
            )}
            {news && (
              <Link href={`/${lang}/news/${news.slug}`} className={styles.mini}>
                <Image
                  src={news.photo.url}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 50vw, 25vw"
                  className={styles.photo}
                />
                <span className={styles.miniTag}>{t.newsTag}</span>
                <span className={styles.miniTitle}>{news.title}</span>
                <span className={styles.miniMeta}>
                  <Icon name="calendar" size={14} />
                  {formatDate(news.date, lang)}
                </span>
              </Link>
            )}
          </div>
        </div>
        <PhotoOfDay
          lang={lang}
          labels={t}
          today={data.today}
          weather={data.weather}
          rates={data.rates}
          photos={data.photos}
        />
      </div>
      <p className={styles.demo}>{t.demo}</p>

      <ul className={styles.tiles}>
        <li className={styles.tileEvents}>
          <Tile
            title={t.tiles.events.title}
            text={t.tiles.events.text}
            link={t.tiles.events.link}
            href={`/${lang}/events`}
            icon="music"
          />
        </li>
        <li className={styles.tileCabinet}>
          <Tile
            title={t.tiles.cabinet.title}
            text={t.tiles.cabinet.text}
            link={t.tiles.cabinet.link}
            href={`/${lang}/applications`}
            icon="user"
          />
        </li>
        <li className={styles.tileSurveys}>
          <Tile
            title={t.tiles.surveys.title}
            text={format(t.tiles.surveys.text, { n: data.openSurveys })}
            link={t.tiles.surveys.link}
            href={data.survey ? `/${lang}/surveys/${data.survey.slug}` : `/${lang}/surveys`}
            icon="chat"
          />
        </li>
        <li className={styles.tileSituations}>
          <Tile
            title={t.tiles.situations.title}
            text={t.tiles.situations.text}
            link={t.tiles.situations.link}
            href={`/${lang}/situations`}
            icon="house"
          />
        </li>
        <li className={styles.tileServices}>
          <div className={styles.tile}>
            <h2 className={styles.tileTitle}>{t.tiles.services.title}</h2>
            <ul className={styles.serviceList}>
              {data.services.map((service) => (
                <li key={service.slug}>
                  <Link href={`/${lang}/services/${service.slug}`} className={styles.serviceLink}>
                    <span className={styles.serviceName}>{service.title}</span>
                    <span className={styles.serviceText}>{service.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={`/${lang}/services`} className={styles.tileLink}>
              {t.tiles.services.link}
              <Icon name="next" size={18} />
            </Link>
          </div>
        </li>
      </ul>

      <section className={styles.section} aria-labelledby="region-news">
        <div className={styles.sectionHead}>
          <h2 id="region-news" className={styles.sectionTitle}>
            {t.news}
          </h2>
          <Link href={`/${lang}/news`} className={styles.sectionLink}>
            {t.allNews}
          </Link>
        </div>
        <ul className={styles.newsList}>
          {data.news.map((item) => (
            <li key={item.slug}>
              <Link href={`/${lang}/news/${item.slug}`} className={styles.newsItem}>
                <span className={styles.newsPhoto}>
                  <Image src={item.photo.url} alt="" fill sizes="120px" className={styles.photo} />
                </span>
                <span className={styles.newsText}>
                  <span className={styles.newsDate}>{formatDate(item.date, lang)}</span>
                  <span className={styles.newsTitle}>{item.title}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="region-events">
        <div className={styles.sectionHead}>
          <h2 id="region-events" className={styles.sectionTitle}>
            {t.events}
          </h2>
          <Link href={`/${lang}/events`} className={styles.sectionLink}>
            {t.allEvents}
          </Link>
        </div>
        <ul className={eventStyles.grid}>
          {data.events.map((event) => (
            <li key={event.slug}>
              <EventCard event={event} lang={lang} labels={dict.eventsPage} />
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.section}>
        <PhotoCredits label={dict.home.credits.label} credits={data.credits} />
      </div>
    </>
  );
}

function Tile({
  title,
  text,
  link,
  href,
  icon,
}: {
  title: string;
  text: string;
  link: string;
  href: string;
  icon: "music" | "user" | "chat" | "house";
}) {
  return (
    <div className={styles.tile}>
      <Icon name={icon} size={40} strokeWidth={1.3} className={styles.tileIcon} />
      <h2 className={styles.tileTitle}>{title}</h2>
      <p className={styles.tileText}>{text}</p>
      <Link href={href} className={styles.tileLink}>
        {link}
        <Icon name="next" size={18} />
      </Link>
    </div>
  );
}
