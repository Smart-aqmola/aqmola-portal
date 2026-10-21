"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeLabels, localizePath, switcherLocales, type Locale } from "@/shared/i18n/config";
import styles from "./language-switcher.module.css";

type LanguageSwitcherProps = {
  lang: Locale;
  label: string;
  /** The languages to offer; the current one is always among them. */
  locales?: readonly Locale[];
};

export function LanguageSwitcher({
  lang,
  label,
  locales = switcherLocales,
}: LanguageSwitcherProps) {
  const pathname = usePathname();

  return (
    <div className={styles.switcher} role="group" aria-label={label}>
      {(locales.includes(lang) ? locales : [...locales, lang]).map((locale) => (
        <Link
          key={locale}
          href={localizePath(pathname, locale)}
          className={styles.link}
          hrefLang={locale}
          lang={locale}
          aria-current={locale === lang ? "true" : undefined}
        >
          {localeLabels[locale].short}
        </Link>
      ))}
    </div>
  );
}
