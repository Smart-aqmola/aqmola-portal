"use client";

import Link from "next/link";
import type { ProviderInfo } from "@/features/account/domain/availability";
import { useProfiles } from "@/features/account/ui/use-profiles";
import { useAllProperties } from "@/features/account/ui/use-properties";
import { useAllContracts } from "@/features/contracts/ui/use-contracts";
import type { Locale } from "@/shared/i18n/config";
import { AdminArea, type AdminDict } from "./admin-area";
import styles from "./admin.module.css";

type Props = { lang: Locale; dict: AdminDict; providers: readonly ProviderInfo[] };

const SECTIONS = [
  "reports",
  "organizations",
  "forms",
  "settings",
  "templates",
  "integrations",
  "audit",
] as const;
const HREF = {
  reports: "reports",
  organizations: "organizations",
  forms: "forms",
  settings: "settings",
  templates: "templates",
  integrations: "integrations",
  audit: "audit",
} as const;

/** The first page of the administration: the main numbers and the way to every section. */
export function AdminOverview(props: Props) {
  return (
    <AdminArea lang={props.lang} dict={props.dict} current="overview">
      {() => <Overview {...props} />}
    </AdminArea>
  );
}

function Overview({ lang, dict, providers }: Props) {
  const t = dict.admin.overview;
  const { profiles } = useProfiles();
  const properties = useAllProperties();
  const { all } = useAllContracts();
  const open = all.filter(
    (item) =>
      item.status !== "draft" &&
      !["concluded", "active", "refused", "terminated"].includes(item.status),
  ).length;

  const stats: [string, number][] = [
    [t.cards.users, profiles.length],
    [t.cards.properties, properties.length],
    [t.cards.providers, providers.length],
    [t.cards.open, open],
  ];

  return (
    <>
      <div>
        <h2 className={styles.sectionTitle}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>
      <ul className={styles.stats}>
        {stats.map(([label, value]) => (
          <li key={label} className={styles.stat}>
            <span className={styles.note}>{label}</span>
            <span className={styles.statValue}>{value}</span>
          </li>
        ))}
      </ul>
      <ul className={styles.items}>
        {SECTIONS.map((id) => (
          <li key={id}>
            <Link href={`/${lang}/admin/${HREF[id]}`} className={styles.linkCard}>
              <span className={styles.linkTitle}>{dict.admin.nav[id]}</span>
              <span className={styles.note}>{t.links[id]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
