import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import { formatDate } from "@/shared/i18n/format-date";
import type { HomeNews } from "../load-home";
import styles from "./news-list.module.css";

type NewsListProps = {
  lang: Locale;
  title: string;
  allLabel: string;
  items: HomeNews[];
};

export function NewsList({ lang, title, allLabel, items }: NewsListProps) {
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        <Link href={`/${lang}/news`} className={styles.all}>
          {allLabel}
        </Link>
      </div>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.slug}>
            <Link href={`/${lang}/news/${item.slug}`} className={styles.item}>
              <Image
                src={item.photo.url}
                alt={item.photo.alt}
                width={120}
                height={84}
                sizes="120px"
                className={styles.photo}
              />
              <span>
                <span className={styles.meta}>
                  <time dateTime={item.date}>{formatDate(item.date, lang)}</time>
                  {item.territory && <span>, {item.territory}</span>}
                </span>
                <span className={styles.headline}>{item.title}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
