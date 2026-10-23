import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import styles from "./site-footer.module.css";

type SiteFooterProps = {
  lang: Locale;
  dict: Pick<Dictionary, "brand" | "footer">;
};

export function SiteFooter({ lang, dict }: SiteFooterProps) {
  const { footer } = dict;
  const columns = [
    {
      title: footer.residents,
      links: [
        { href: "services", label: footer.services },
        { href: "applications", label: footer.applications },
        { href: "situations", label: footer.situations },
      ],
    },
    {
      title: footer.business,
      links: [
        { href: "services?for=business", label: footer.businessServices },
        { href: "operator", label: footer.operator },
      ],
    },
    {
      title: footer.region,
      links: [
        { href: "organizations", label: footer.organizations },
        { href: "help", label: footer.help },
        { href: "contacts", label: footer.contacts },
        { href: "events", label: footer.events },
        { href: "surveys", label: footer.surveys },
        { href: "about", label: footer.aboutRegion },
        { href: "news", label: footer.news },
        { href: "tourism", label: footer.tourism },
      ],
    },
  ];

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div>
            <strong className={styles.brand}>{dict.brand.name}</strong>
            <p>{footer.about}</p>
          </div>
          {columns.map((column) => (
            <section key={column.title}>
              <h2 className={styles.heading}>{column.title}</h2>
              <ul className={styles.list}>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={`/${lang}/${link.href}`} className={styles.link}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className={styles.rights}>{footer.rights}</p>
      </div>
    </footer>
  );
}
