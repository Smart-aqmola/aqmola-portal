import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { isRequestKind, requestKinds } from "@/features/meters/domain/meter-request";
import { RequestForm } from "@/features/meters/ui/request-form";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { pickDictionary } from "@/shared/i18n/pick-dictionary";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/meters/order/[kind]">;

const ID = /^[a-z0-9-]{1,60}$/;
const id = (value: string | string[] | undefined) =>
  typeof value === "string" && ID.test(value) ? value : undefined;

export function generateStaticParams() {
  return locales.flatMap((lang) => requestKinds.map((kind) => ({ lang, kind })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, kind } = await params;
  if (!hasLocale(lang) || !isRequestKind(kind)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.meters.nav[kind]} — ${dict.brand.name}` };
}

export default function OrderPage({ params, searchParams }: Props) {
  return (
    <div className={`container ${styles.page}`}>
      {/* The object and the meter come from the address, so they are read at request time. */}
      <Suspense fallback={<PageSkeleton blocks={2} />}>
        <Order params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Order({
  params,
  searchParams,
}: {
  params: Props["params"];
  searchParams: Props["searchParams"];
}) {
  const { lang, kind } = await params;
  if (!hasLocale(lang) || !isRequestKind(kind)) notFound();
  const [dict, territories, query] = await Promise.all([
    getDictionary(lang),
    loadTerritoryOptions(lang),
    searchParams,
  ]);

  return (
    <>
      <h1 className={styles.title}>{dict.meters.title}</h1>
      <p className={styles.lead}>{dict.meters.lead}</p>
      <div className={styles.narrow}>
        <RequestForm
          lang={lang}
          dict={pickDictionary(dict, "account", "contracts", "list", "meters", "properties")}
          territories={territories}
          kind={kind}
          preset={{ property: id(query.property), meter: id(query.meter) }}
        />
      </div>
    </>
  );
}
