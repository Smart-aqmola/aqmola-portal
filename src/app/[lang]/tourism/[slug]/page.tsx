import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalogHref } from "@/features/catalog/domain/catalog-params";
import { listPlaceSlugs, loadPlace } from "@/features/content/load-places";
import { PlacesGrid } from "@/features/home/ui/places-grid";
import { hasLocale, locales } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs/breadcrumbs";
import { Button } from "@/shared/ui/button/button";
import { PhotoCredits } from "@/shared/ui/photo-credits/photo-credits";
import newsStyles from "@/features/content/ui/news.module.css";
import styles from "@/shared/styles/page.module.css";

type Props = PageProps<"/[lang]/tourism/[slug]">;

export async function generateStaticParams() {
  const slugs = await listPlaceSlugs();
  return locales.flatMap((lang) => slugs.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const [dict, place] = await Promise.all([getDictionary(lang), loadPlace(lang, slug)]);
  if (!place) return {};
  return { title: `${place.name} — ${dict.brand.name}`, description: place.summary };
}

export default async function PlacePage({ params }: Props) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, place] = await Promise.all([getDictionary(lang), loadPlace(lang, slug)]);
  if (!place) notFound();
  const t = dict.tourismPage;

  return (
    <div className={`container ${styles.page}`}>
      <Breadcrumbs
        label={dict.serviceDetails.breadcrumbs.label}
        items={[
          { label: dict.nav.home, href: `/${lang}` },
          { label: dict.nav.tourism, href: `/${lang}/tourism` },
          { label: place.name },
        ]}
      />
      <article className={newsStyles.article} style={{ marginTop: "var(--space-5)" }}>
        <header>
          <ul className={newsStyles.tags}>
            {place.facts.map((fact) => (
              <li key={fact} className={newsStyles.tag}>
                {dict.home.tourism.facts[fact]}
              </li>
            ))}
            <li className={newsStyles.tag}>{place.territory}</li>
          </ul>
          <h1 className={styles.title}>{place.name}</h1>
          <p className={styles.lead}>{place.summary}</p>
        </header>
        <Image
          src={place.photo.url}
          alt={place.photo.alt}
          width={960}
          height={540}
          sizes="(max-width: 800px) 100vw, 768px"
          className={newsStyles.hero}
          priority
        />
        <div className={newsStyles.paragraphs}>
          {place.paragraphs.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
        <p className={newsStyles.note}>{t.testNote}</p>
        <PhotoCredits label={dict.home.credits.label} credits={[place.photo.credit]} />

        <section>
          <h2 className={newsStyles.sectionTitle}>{t.services}</h2>
          <p>{format(t.servicesText, { territory: place.territory })}</p>
          <div style={{ marginTop: "var(--space-3)" }}>
            <Button href={catalogHref(lang, { territory: place.territoryId })}>
              {t.servicesButton}
            </Button>
          </div>
        </section>
        <Link href={`/${lang}/tourism`} className={newsStyles.reset}>
          ← {t.back}
        </Link>
      </article>

      <section className={newsStyles.section}>
        <h2 className={newsStyles.sectionTitle}>{t.others}</h2>
        <PlacesGrid
          lang={lang}
          factLabels={dict.home.tourism.facts}
          places={place.others.map((other) => ({
            slug: other.slug,
            name: other.name,
            summary: other.summary,
            territory: other.territory,
            facts: other.facts,
            photo: other.photo,
          }))}
        />
      </section>
    </div>
  );
}
