import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { ReadingForm } from "@/features/meters/ui/reading-form";
import { hasLocale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/meters/submit">;

const ID = /^[a-z0-9-]{1,60}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.meters.nav.submit} — ${dict.brand.name}` };
}

export default function SubmitReadingPage({ params, searchParams }: Props) {
  return (
    <div className={`container ${styles.page}`}>
      {/* The meter comes from the address, so it is read at request time. */}
      <Suspense fallback={<PageSkeleton blocks={2} />}>
        <Submit params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Submit({
  params,
  searchParams,
}: {
  params: Props["params"];
  searchParams: Props["searchParams"];
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, territories, query] = await Promise.all([
    getDictionary(lang),
    loadTerritoryOptions(lang),
    searchParams,
  ]);
  const meter = typeof query.meter === "string" && ID.test(query.meter) ? query.meter : undefined;

  return (
    <>
      <h1 className={styles.title}>{dict.meters.title}</h1>
      <p className={styles.lead}>{dict.meters.lead}</p>
      <div className={styles.narrow}>
        <ReadingForm lang={lang} dict={dict} territories={territories} preset={{ meter }} />
      </div>
    </>
  );
}
