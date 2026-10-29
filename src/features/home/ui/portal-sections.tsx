import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Icon } from "@/shared/ui/icon/icon";
import { portalSections, type PortalSection } from "../domain/home-content";
import styles from "./portal-sections.module.css";

type PortalSectionsProps = {
  lang: Locale;
  labels: Dictionary["home"]["portal"];
  /** Which sections to show; all of them unless a test or a trimmed page says otherwise. */
  sections?: readonly PortalSection[];
};

/** The sections named in the specification (1.1); one that is not built yet says "soon". */
export function PortalSections({ lang, labels, sections = portalSections }: PortalSectionsProps) {
  return (
    <section aria-labelledby="portal-title">
      <h2 id="portal-title" className={styles.title}>
        {labels.title}
      </h2>
      <ul className={styles.grid}>
        {sections.map((section) => {
          const text = labels.sections[section.id];
          const body = (
            <>
              <span className={styles.icon}>
                <Icon name={section.icon} size={22} />
              </span>
              <span className={styles.name}>{text.title}</span>
              <span className={styles.text}>{text.text}</span>
            </>
          );
          return (
            <li key={section.id}>
              {section.path ? (
                <Link href={`/${lang}${section.path}`} className={styles.tile}>
                  {body}
                </Link>
              ) : (
                <div className={styles.tile} data-soon="true">
                  {body}
                  <span className={styles.soon}>{labels.soon}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
