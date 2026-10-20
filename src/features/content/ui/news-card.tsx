import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import type { NewsCardData } from "../load-news";
import styles from "./news.module.css";

type NewsCardProps = {
  item: NewsCardData;
  lang: Locale;
  dict: Pick<Dictionary, "newsPage">;
};

export function NewsCard({ item, lang, dict }: NewsCardProps) {
  const t = dict.newsPage;
  return (
    <article className={styles.card}>
      <Image
        src={item.photo.url}
        alt={item.photo.alt}
        width={240}
        height={160}
        sizes="(max-width: 600px) 100vw, 240px"
        className={styles.photo}
      />
      <div className={styles.body}>
        <p className={styles.meta}>
          <time dateTime={item.date}>{formatDate(item.date, lang)}</time>
          <span>{t.topics[item.topic]}</span>
          {item.territory && <span>{item.territory}</span>}
        </p>
        <h3 className={styles.headline}>
          <Link href={`/${lang}/news/${item.slug}`} className={styles.link}>
            {item.title}
          </Link>
        </h3>
        <p className={styles.summary}>{item.summary}</p>
        <p className={styles.meta}>{format(t.views, { n: item.views })}</p>
      </div>
    </article>
  );
}
