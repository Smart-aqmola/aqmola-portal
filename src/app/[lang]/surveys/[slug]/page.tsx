import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { loadSurvey } from "@/features/surveys/load-surveys";
import { SurveyCard } from "@/features/surveys/ui/survey-card";
import { SurveyView } from "@/features/surveys/ui/survey-view";
import styles from "@/features/surveys/ui/surveys.module.css";
import { hasLocale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { Icon } from "@/shared/ui/icon/icon";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";
import page from "@/shared/styles/page.module.css";

type Props = PageProps<"/[lang]/surveys/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const [dict, data] = await Promise.all([
    getDictionary(lang),
    loadSurvey(lang, slug, new Date(0)),
  ]);
  if (!data) return {};
  return {
    title: `${data.survey.title} — ${dict.surveysPage.title} — ${dict.brand.name}`,
    description: data.survey.summary,
  };
}

export default function SurveyPage({ params }: Props) {
  return (
    <div className={`container ${page.page}`}>
      {/* Whether the survey is open depends on today, so the page is made at request time. */}
      <Suspense fallback={<PageSkeleton blocks={3} />}>
        <Survey params={params} />
      </Suspense>
    </div>
  );
}

async function Survey({ params }: { params: Props["params"] }) {
  await connection();
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, data] = await Promise.all([getDictionary(lang), loadSurvey(lang, slug, new Date())]);
  if (!data) notFound();
  const t = dict.surveysPage;

  return (
    <>
      <Link href={`/${lang}/surveys`} className={styles.back}>
        <Icon name="next" size={18} className={styles.backIcon} />
        {t.back}
      </Link>
      <h1 className={styles.pageTitle}>{data.survey.title}</h1>
      <SurveyView survey={data.survey} lang={lang} labels={t} />

      {data.others.length > 0 && (
        <section className={styles.section} aria-labelledby="others">
          <h2 id="others" className={styles.sectionTitle}>
            {t.others}
          </h2>
          <ul className={styles.grid}>
            {data.others.map((survey) => (
              <li key={survey.slug}>
                <SurveyCard survey={survey} lang={lang} labels={t} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
