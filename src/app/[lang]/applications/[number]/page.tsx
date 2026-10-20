import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { ApplicationDetail } from "@/features/applications/ui/application-detail";
import { NUMBER_PATTERN } from "@/features/applications/domain/application";
import { hasLocale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs/breadcrumbs";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/applications/[number]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, number } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${number} — ${dict.applications.title} — ${dict.brand.name}` };
}

export default function ApplicationPage({ params, searchParams }: Props) {
  return (
    <div className={`container ${styles.page}`}>
      {/* Applications live in the browser, so the number and the "just created" flag are read at request time. */}
      <Suspense fallback={<div className={styles.loading} aria-hidden="true" />}>
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Detail({
  params,
  searchParams,
}: {
  params: Props["params"];
  searchParams: Props["searchParams"];
}) {
  const { lang, number } = await params;
  if (!hasLocale(lang) || !NUMBER_PATTERN.test(number)) notFound();
  const [dict, territories, query] = await Promise.all([
    getDictionary(lang),
    loadTerritoryOptions(lang),
    searchParams,
  ]);

  return (
    <>
      <Breadcrumbs
        label={dict.serviceDetails.breadcrumbs.label}
        items={[
          { label: dict.nav.home, href: `/${lang}` },
          { label: dict.nav.applications, href: `/${lang}/applications` },
          { label: number },
        ]}
      />
      <div className={styles.narrow}>
        <ApplicationDetail
          lang={lang}
          number={number}
          justCreated={query.new === "1"}
          territories={territories}
          dict={dict}
        />
      </div>
    </>
  );
}
