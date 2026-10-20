import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listNewsSlugs, loadArticle } from "@/features/content/load-news";
import { NewsCard } from "@/features/content/ui/news-card";
import { hasLocale, locales } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs/breadcrumbs";
import { PhotoCredits } from "@/shared/ui/photo-credits/photo-credits";
import newsStyles from "@/features/content/ui/news.module.css";
import styles from "@/shared/styles/page.module.css";

type Props = PageProps<"/[lang]/news/[slug]">;

export async function generateStaticParams() {
  const slugs = await listNewsSlugs();
  return locales.flatMap((lang) => slugs.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const [dict, article] = await Promise.all([getDictionary(lang), loadArticle(lang, slug)]);
  if (!article) return {};
  return { title: `${article.title} — ${dict.brand.name}`, description: article.summary };
}

export default async function ArticlePage({ params }: Props) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, article] = await Promise.all([getDictionary(lang), loadArticle(lang, slug)]);
  if (!article) notFound();
  const t = dict.newsPage;

  return (
    <div className={`container ${styles.page}`}>
      <Breadcrumbs
        label={dict.serviceDetails.breadcrumbs.label}
        items={[
          { label: dict.nav.home, href: `/${lang}` },
          { label: dict.nav.news, href: `/${lang}/news` },
          { label: article.title },
        ]}
      />
      <article className={newsStyles.article} style={{ marginTop: "var(--space-5)" }}>
        <header>
          <ul className={newsStyles.tags}>
            <li className={newsStyles.tag}>{t.topics[article.topic]}</li>
            {article.territory && <li className={newsStyles.tag}>{article.territory}</li>}
          </ul>
          <h1 className={styles.title}>{article.title}</h1>
          <p className={styles.lead}>
            <time dateTime={article.date}>{formatDate(article.date, lang)}</time> ·{" "}
            {format(t.views, { n: article.views })}
          </p>
        </header>
        <Image
          src={article.photo.url}
          alt={article.photo.alt}
          width={960}
          height={540}
          sizes="(max-width: 800px) 100vw, 768px"
          className={newsStyles.hero}
          priority
        />
        <div className={newsStyles.paragraphs}>
          {article.paragraphs.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
        <p className={newsStyles.note}>{t.article.testNote}</p>
        <PhotoCredits label={dict.home.credits.label} credits={[article.photo.credit]} />
        <Link href={`/${lang}/news`} className={newsStyles.reset}>
          ← {t.article.back}
        </Link>
      </article>

      <section className={newsStyles.section}>
        <h2 className={newsStyles.sectionTitle}>{t.article.other}</h2>
        <ul className={newsStyles.list}>
          {article.other.map((item) => (
            <li key={item.slug}>
              <NewsCard item={item} lang={lang} dict={dict} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
