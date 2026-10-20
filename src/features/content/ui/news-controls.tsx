import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { Icon } from "@/shared/ui/icon/icon";
import { newsHref, type NewsParams } from "../domain/news-params";
import { newsTopics } from "../domain/types";
import styles from "./news.module.css";

type NewsControlsProps = {
  lang: Locale;
  params: NewsParams;
  dict: Pick<Dictionary, "newsPage">;
};

/** Search is a plain GET form and topics and tabs are links, so everything works without JavaScript. */
export function NewsControls({ lang, params, dict }: NewsControlsProps) {
  const t = dict.newsPage;
  const base = { ...params, page: 1 };

  return (
    <div className={styles.controls}>
      <form
        key={JSON.stringify(params)}
        className={styles.search}
        role="search"
        aria-label={t.search.label}
        action={`/${lang}/news`}
        method="get"
      >
        {params.topic && <input type="hidden" name="topic" value={params.topic} />}
        {params.tab !== "latest" && <input type="hidden" name="tab" value={params.tab} />}
        <label className={styles.field}>
          <Icon name="search" />
          <span className="visually-hidden">{t.search.queryLabel}</span>
          <input
            type="search"
            name="q"
            defaultValue={params.q}
            placeholder={t.search.placeholder}
            maxLength={100}
            autoComplete="off"
          />
        </label>
        <Button type="submit">{t.search.submit}</Button>
        {(params.q || params.topic) && (
          <Link href={newsHref(lang, { q: "", tab: params.tab, page: 1 })} className={styles.reset}>
            {t.reset}
          </Link>
        )}
      </form>

      <nav aria-label={t.topicsLabel}>
        <ul className={styles.chips}>
          {[undefined, ...newsTopics].map((topic) => (
            <li key={topic ?? "all"}>
              <Link
                href={newsHref(lang, { ...base, topic })}
                className={styles.chip}
                aria-current={params.topic === topic ? "true" : undefined}
              >
                {t.topics[topic ?? "all"]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label={t.tabs.label}>
        <ul className={styles.tabs}>
          {(["latest", "popular"] as const).map((tab) => (
            <li key={tab}>
              <Link
                href={newsHref(lang, { ...base, tab })}
                className={styles.tab}
                aria-current={params.tab === tab ? "true" : undefined}
              >
                {t.tabs[tab]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
