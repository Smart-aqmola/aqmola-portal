"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { defaultLocale, hasLocale } from "@/shared/i18n/config";
import { systemMessages } from "@/shared/i18n/system-messages";
import { Button } from "@/shared/ui/button/button";
import styles from "./system-page.module.css";

/**
 * What the visitor sees when a page breaks: plain words and a way out, never the text of the error
 * or anything from the server (spec 18.8, 19.8). The details stay in the logs.
 */
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { lang } = useParams<{ lang: string }>();
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const t = systemMessages[locale].error;

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{t.title}</h1>
      <p className={styles.text}>{t.text}</p>
      <div className={styles.actions}>
        <Button onClick={reset}>{t.retry}</Button>
        <Link href={`/${locale}`} className={styles.link}>
          {t.home}
        </Link>
      </div>
    </div>
  );
}
