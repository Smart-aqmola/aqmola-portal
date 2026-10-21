import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalogHref } from "@/features/catalog/domain/catalog-params";
import { listServiceSlugs, loadService } from "@/features/catalog/load-service";
import { ServiceCard } from "@/features/catalog/ui/service-card";
import { DocumentsList, FactsPanel, StepsList } from "@/features/catalog/ui/service-info";
import { FavoriteButton } from "@/features/favorites/ui/favorite-button";
import { hasLocale, locales } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs/breadcrumbs";
import { Button } from "@/shared/ui/button/button";
import styles from "./page.module.css";

type Props = PageProps<"/[lang]/services/[slug]">;

export async function generateStaticParams() {
  const slugs = await listServiceSlugs();
  return locales.flatMap((lang) => slugs.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const details = await loadService(lang, slug);
  if (!details) return {};
  const dict = await getDictionary(lang);
  return {
    title: `${details.card.title} — ${dict.brand.name}`,
    description: details.card.summary,
  };
}

export default async function ServicePage({ params }: Props) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, details] = await Promise.all([getDictionary(lang), loadService(lang, slug)]);
  if (!details) notFound();

  const { card } = details;
  const audience = {
    resident: dict.home.service.resident,
    business: dict.home.service.business,
    both: dict.home.service.both,
  }[card.audience];

  return (
    <div className={`container ${styles.page}`}>
      <Breadcrumbs
        label={dict.serviceDetails.breadcrumbs.label}
        items={[
          { label: dict.nav.home, href: `/${lang}` },
          { label: dict.nav.services, href: `/${lang}/services` },
          { label: card.title },
        ]}
      />

      <div className={styles.layout}>
        <article className={styles.main}>
          <header>
            <ul className={styles.tags}>
              <li className={styles.tag}>{audience}</li>
              {card.free && <li className={styles.tag}>{dict.home.service.free}</li>}
              <li>
                <Link
                  className={styles.tag}
                  href={catalogHref(lang, { category: details.category.id })}
                >
                  {details.category.name}
                </Link>
              </li>
            </ul>
            <h1 className={styles.title}>{card.title}</h1>
            <p className={styles.summary}>{card.summary}</p>
            <div className={styles.actions}>
              <Button href={`/${lang}/services/${card.slug}/apply`} size="lg">
                {dict.serviceDetails.order}
              </Button>
              <FavoriteButton slug={card.slug} labels={dict.catalog.favorites} />
            </div>
          </header>

          <StepsList steps={details.steps} dict={dict} />
          <DocumentsList documents={details.documents} dict={dict} />
          <p className={styles.note}>{dict.serviceDetails.testNote}</p>
        </article>

        <FactsPanel details={details} lang={lang} dict={dict} />
      </div>

      {details.related.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relatedTitle}>
            {format(dict.serviceDetails.related, { name: details.situation.name })}
          </h2>
          <ul className={styles.relatedList}>
            {details.related.map((service) => (
              <li key={service.slug}>
                <ServiceCard
                  service={service}
                  lang={lang}
                  labels={dict.home.service}
                  favoriteLabels={dict.catalog.favorites}
                  documentNames={dict.serviceDetails.documents.items}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
