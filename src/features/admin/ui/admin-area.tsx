"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ProviderInfo } from "@/features/account/domain/availability";
import { useSession } from "@/features/applications/ui/use-session";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { useToast } from "@/shared/ui/toast/toast-provider";
import type { AdminConfig } from "../domain/config";
import { useAdminConfig } from "./use-admin-config";
import styles from "./admin.module.css";

export type AdminDict = Pick<
  Dictionary,
  | "list"
  | "admin"
  | "cabinet"
  | "notifications"
  | "contracts"
  | "properties"
  | "meters"
  | "billing"
  | "appeals"
  | "status"
>;

export type AdminNavId =
  | "overview"
  | "reports"
  | "organizations"
  | "forms"
  | "settings"
  | "templates"
  | "integrations"
  | "audit";

const HREFS: Record<AdminNavId, string> = {
  overview: "admin",
  reports: "admin/reports",
  organizations: "admin/organizations",
  forms: "admin/forms",
  settings: "admin/settings",
  templates: "admin/templates",
  integrations: "admin/integrations",
  audit: "admin/audit",
};

function AdminNav({
  lang,
  labels,
  current,
}: {
  lang: Locale;
  labels: AdminDict["admin"]["nav"];
  current: AdminNavId;
}) {
  return (
    <nav aria-label={labels.label} className={styles.tabs}>
      <ul className={styles.subnavList}>
        {(Object.keys(HREFS) as AdminNavId[]).map((id) => (
          <li key={id}>
            <Link
              href={`/${lang}/${HREFS[id]}`}
              className={styles.subnavLink}
              aria-current={id === current ? "page" : undefined}
            >
              {labels[id]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export type AdminContext = {
  config: AdminConfig;
  /** Saves the new settings, says so (spec 18.7) and writes the journal (spec 13.4). */
  save: (next: AdminConfig, section: string) => void;
};

export type AdminAreaProps = {
  lang: Locale;
  dict: AdminDict;
  current: AdminNavId;
  children: (context: AdminContext) => ReactNode;
};

/** Only the administrator gets in, and the administrative pages are apart from the others (spec 19.6). */
export function AdminArea({ lang, dict, current, children }: AdminAreaProps) {
  const { session, ready } = useSession();
  const { config, update } = useAdminConfig();
  const toast = useToast();

  if (!ready) return <div className={styles.card} aria-hidden="true" />;

  if (!session || session.role !== "admin") {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{dict.admin.signInRequired.title}</h2>
        <p>{session ? dict.admin.notAdmin : dict.admin.signInRequired.text}</p>
        <div>
          <Button href={`/${lang}/sign-in`}>{dict.admin.signInRequired.button}</Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <AdminNav lang={lang} labels={dict.admin.nav} current={current} />
      {children({
        config,
        save: (next, section) =>
          toast.show(update(next, section) ? dict.admin.saved : dict.admin.notChanged),
      })}
    </>
  );
}

export type { ProviderInfo };
