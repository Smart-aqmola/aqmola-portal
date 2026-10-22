"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { defaultLocale, hasLocale } from "@/shared/i18n/config";
import { systemMessages } from "@/shared/i18n/system-messages";
import styles from "./system-page.module.css";

/** The page for an address that leads nowhere, in the language of the address. */
export default function NotFoundPage() {
  const first = usePathname().split("/")[1] ?? "";
  const locale = hasLocale(first) ? first : defaultLocale;
  const t = systemMessages[locale].notFound;

  return (
    <div className={`container ${styles.page}`}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>{t.title}</h1>
      <p className={styles.text}>{t.text}</p>
      <div className={styles.actions}>
        <Link href={`/${locale}`} className={styles.link}>
          {t.home}
        </Link>
      </div>
    </div>
  );
}
