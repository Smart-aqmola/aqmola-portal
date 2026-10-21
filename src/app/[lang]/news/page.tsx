import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Pagination } from "@/features/catalog/ui/pagination";
import { newsHref } from "@/features/content/domain/news-params";
import { loadNews } from "@/features/content/load-news";
import { NewsCard } from "@/features/content/ui/news-card";
import { NewsControls } from "@/features/content/ui/news-controls";
import { hasLocale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import newsStyles from "@/features/content/ui/news.module.css";
import styles from "@/shared/styles/page.module.css";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";

type Props = PageProps<"/[lang]/news">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.newsPage.title} — ${dict.brand.name}` };
}

export default function NewsPage({ params, searchParams }: Props) {
  return (
    <div className={`container ${styles.page}`}>
      {/* The address is read at request time, so the list streams in behind this placeholder. */}
      <Suspense fallback={<PageSkeleton />}>
        <News params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function News({
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
    searchParams.then((raw) => loadNews(lang, raw)),
  ]);
  const t = dict.newsPage;

  return (
    <>
      <h1 className={styles.title}>{t.title}</h1>
      <p className={styles.lead}>{t.lead}</p>
      <div className={styles.narrow} style={{ maxWidth: "60rem" }}>
        <NewsControls lang={lang} params={data.params} dict={dict} />
        <p role="status">{format(t.found, { n: data.total })}</p>
        {data.items.length === 0 ? (
          <section>
            <h2 className={newsStyles.sectionTitle}>{t.empty.title}</h2>
            <p>{t.empty.text}</p>
            <Button href={newsHref(lang, { q: "", tab: "latest", page: 1 })}>{t.reset}</Button>
          </section>
        ) : (
          <>
            <h2 className="visually-hidden">{t.listTitle}</h2>
            <ul className={newsStyles.list}>
              {data.items.map((item) => (
                <li key={item.slug}>
                  <NewsCard item={item} lang={lang} dict={dict} />
                </li>
              ))}
            </ul>
          </>
        )}
        <Pagination
          page={data.page}
          pageCount={data.pageCount}
          labels={dict.catalog.pagination}
          hrefFor={(page) => newsHref(lang, { ...data.params, page })}
        />
      </div>
    </>
  );
}
