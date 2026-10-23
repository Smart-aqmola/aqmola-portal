import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { surveyCategories } from "@/features/surveys/domain/types";
import { loadSurveys, type SurveyCardData } from "@/features/surveys/load-surveys";
import { SurveyCard, categoryIcons } from "@/features/surveys/ui/survey-card";
import styles from "@/features/surveys/ui/surveys.module.css";
import { hasLocale, type Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { getDictionary, type Dictionary } from "@/shared/i18n/get-dictionary";
import { Icon } from "@/shared/ui/icon/icon";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";
import page from "@/shared/styles/page.module.css";

type Props = PageProps<"/[lang]/surveys">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: `${dict.surveysPage.title} — ${dict.brand.name}`,
    description: dict.surveysPage.lead,
  };
}

export default function SurveysPage({ params, searchParams }: Props) {
  return (
    <div className={`container ${page.page}`}>
      {/* Which surveys are still open depends on today, so the page streams in. */}
      <Suspense fallback={<PageSkeleton blocks={3} />}>
        <Surveys params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function Cards({
  items,
  lang,
  labels,
}: {
  items: SurveyCardData[];
  lang: Locale;
  labels: Dictionary["surveysPage"];
}) {
  return (
    <ul className={styles.grid}>
      {items.map((survey) => (
        <li key={survey.slug}>
          <SurveyCard survey={survey} lang={lang} labels={labels} />
        </li>
      ))}
    </ul>
  );
}

async function Surveys({
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
    loadSurveys(lang, query, new Date()),
  ]);
  const t = dict.surveysPage;
  const base = `/${lang}/surveys`;

  return (
    <>
      <h1 className={page.title}>{t.title}</h1>
      <p className={page.lead}>{t.lead}</p>
      <p className={styles.demo}>{t.demo}</p>
      <nav aria-label={t.categoriesLabel}>
        <ul className={styles.chips}>
          <li>
            <Link
              href={base}
              className={styles.chip}
              aria-current={data.category ? undefined : "page"}
            >
              {t.all}
            </Link>
          </li>
          {surveyCategories.map((category) => (
            <li key={category}>
              <Link
                href={`${base}?category=${category}`}
                className={styles.chip}
                aria-current={data.category === category ? "page" : undefined}
              >
                <Icon name={categoryIcons[category]} size={18} />
                {t.categories[category]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {data.category && (
        <p className={styles.demo} role="status">
          {format(t.count, { n: data.open.length + data.finished.length })}
        </p>
      )}

      {data.popular.length > 0 && (
        <section className={styles.section} aria-labelledby="popular">
          <h2 id="popular" className={styles.sectionTitle}>
            {t.popular}
          </h2>
          <Cards items={data.popular} lang={lang} labels={t} />
        </section>
      )}

      <section className={styles.section} aria-labelledby="open">
        <h2 id="open" className={styles.sectionTitle}>
          {t.open}
        </h2>
        {data.open.length === 0 ? (
          <p className={styles.empty}>{t.empty}</p>
        ) : (
          <Cards items={data.open} lang={lang} labels={t} />
        )}
      </section>

      {data.finished.length > 0 && (
        <section className={styles.section} aria-labelledby="finished">
          <h2 id="finished" className={styles.sectionTitle}>
            {t.finished}
          </h2>
          <Cards items={data.finished} lang={lang} labels={t} />
        </section>
      )}
    </>
  );
}
