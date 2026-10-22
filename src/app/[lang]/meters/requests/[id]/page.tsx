import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { RequestDetail } from "@/features/meters/ui/request-detail";
import { hasLocale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { pickDictionary } from "@/shared/i18n/pick-dictionary";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/meters/requests/[id]">;

/** Ids are made by the browser (a UUID); anything else is not a request of ours. */
const ID = /^[a-z0-9-]{1,60}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.meters.nav.requests} — ${dict.brand.name}` };
}

export default function MeterRequestPage({ params }: Props) {
  return (
    <div className={`container ${styles.page}`}>
      {/* Requests live in the browser, so the id is read at request time behind a placeholder. */}
      <Suspense fallback={<PageSkeleton />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: Props["params"] }) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !ID.test(id)) notFound();
  const [dict, territories] = await Promise.all([getDictionary(lang), loadTerritoryOptions(lang)]);

  return (
    <>
      <h1 className={styles.title}>{dict.meters.title}</h1>
      <p className={styles.lead}>{dict.meters.lead}</p>
      <div className={styles.narrow}>
        <RequestDetail
          lang={lang}
          dict={pickDictionary(dict, "account", "contracts", "list", "meters", "properties")}
          territories={territories}
          id={id}
        />
      </div>
    </>
  );
}
