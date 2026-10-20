import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { catalogHref } from "@/features/catalog/domain/catalog-params";
import { loadCatalog } from "@/features/catalog/load-catalog";
import { CatalogFilters } from "@/features/catalog/ui/catalog-filters";
import { CatalogResults } from "@/features/catalog/ui/catalog-results";
import { CategoryChips } from "@/features/catalog/ui/category-chips";
import { Pagination } from "@/features/catalog/ui/pagination";
import { hasLocale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import styles from "./page.module.css";

type Props = PageProps<"/[lang]/services">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.catalog.title} — ${dict.brand.name}` };
}

export default function ServicesPage({ params, searchParams }: Props) {
  return (
    <div className={`container ${styles.page}`}>
      {/* The address is read at request time, so the page streams in behind this placeholder. */}
      <Suspense fallback={<div className={styles.loading} aria-hidden="true" />}>
        <Catalog params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Catalog({
  params,
  searchParams,
}: {
  params: Props["params"];
  searchParams: Props["searchParams"];
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, data] = await Promise.all([
    getDictionary(lang),
    loadCatalog(lang, await searchParams),
  ]);

  return (
    <>
      <h1 className={styles.title}>{dict.catalog.title}</h1>
      <p className={styles.lead}>{dict.catalog.lead}</p>

      <div className={styles.filters}>
        <CatalogFilters lang={lang} labels={dict.catalog} data={data} />
      </div>
      <div className={styles.chips}>
        <CategoryChips
          lang={lang}
          labels={dict.catalog.categories}
          params={data.params}
          categories={data.categories}
        />
      </div>
      <div className={styles.results}>
        <CatalogResults lang={lang} dict={dict} data={data} />
        <Pagination
          page={data.page}
          pageCount={data.pageCount}
          labels={dict.catalog.pagination}
          hrefFor={(page) => catalogHref(lang, { ...data.params, page })}
        />
      </div>
    </>
  );
}
