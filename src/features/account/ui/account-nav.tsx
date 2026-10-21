import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import styles from "./account.module.css";

type AccountNavProps = {
  lang: Locale;
  labels: Dictionary["account"]["nav"];
  current: "applications" | "properties" | "contracts";
};

/** The sections of the personal cabinet. More are added as the stages of the plan arrive. */
export function AccountNav({ lang, labels, current }: AccountNavProps) {
  const items = [
    { id: "applications", href: `/${lang}/applications`, label: labels.applications },
    { id: "properties", href: `/${lang}/properties`, label: labels.properties },
    { id: "contracts", href: `/${lang}/contracts`, label: labels.contracts },
  ] as const;

  return (
    <nav aria-label={labels.label} className={styles.tabs}>
      <ul className={styles.tabList}>
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={styles.tab}
              aria-current={item.id === current ? "page" : undefined}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
