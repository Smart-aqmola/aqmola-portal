import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import type { OrganizationGroup } from "../load-organizations";
import styles from "./organizations-list.module.css";

type OrganizationsListProps = {
  lang: Locale;
  groups: OrganizationGroup[];
  labels: Dictionary["organizations"];
};

/** Every organization with where it works and a link to its services. */
export function OrganizationsList({ lang, groups, labels }: OrganizationsListProps) {
  return (
    <div className={styles.groups}>
      <h2 className="visually-hidden">{labels.groups}</h2>
      {groups.map((group) => (
        <section key={group.sector} aria-labelledby={`group-${group.sector}`}>
          <h3 id={`group-${group.sector}`} className={styles.group}>
            {group.name}
          </h3>
          <ul className={styles.list}>
            {group.items.map((item) => (
              <li key={item.id} className={styles.item}>
                <div className={styles.main}>
                  <h4 className={styles.name}>{item.name}</h4>
                  <p className={styles.area}>
                    {labels.area}: {item.area === "all" ? labels.everywhere : item.area.join(", ")}
                  </p>
                </div>
                <p className={styles.count}>{format(labels.count, { n: item.services })}</p>
                <Link href={`/${lang}/services?organization=${item.id}`} className={styles.open}>
                  {labels.services}
                  <span className="visually-hidden"> — {item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
