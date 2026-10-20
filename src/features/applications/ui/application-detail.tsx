"use client";

import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import { formatDate } from "@/shared/i18n/format-date";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { StatusBadge } from "./status-badge";
import { StatusForm } from "./status-form";
import { useApplications } from "./use-applications";
import { useSession } from "./use-session";
import styles from "./applications.module.css";
import panel from "./panel.module.css";

type Props = {
  lang: Locale;
  number: string;
  justCreated: boolean;
  /** Who looks: the applicant ("owner") or the operator of the organization. */
  mode?: "owner" | "operator";
  territories: { id: string; name: string }[];
  dict: Pick<Dictionary, "applications" | "status" | "serviceDetails" | "operator">;
};

function formatStamp(iso: string, lang: Locale): string {
  return `${formatDate(iso.slice(0, 10), lang)} ${iso.slice(0, 4)}, ${iso.slice(11, 16)} UTC`;
}

export function ApplicationDetail({
  lang,
  number,
  justCreated,
  territories,
  dict,
  mode = "owner",
}: Props) {
  const { session, ready } = useSession();
  const { applications } = useApplications();
  const t = dict.applications;
  const listHref = `/${lang}/${mode === "operator" ? "operator" : "applications"}`;
  const back = (
    <Link href={listHref} className={styles.back}>
      ← {t.detail.back}
    </Link>
  );

  if (!ready) return <div className={panel.placeholder} aria-hidden="true" />;

  const application = applications.find((item) => item.number === number);
  const visible =
    application &&
    session &&
    (mode === "operator"
      ? session.role === "operator" && session.organizationId === application.organizationId
      : session.role === application.ownerRole);

  if (!application || !visible) {
    return (
      <section className={panel.card}>
        <h2 className={panel.heading}>{t.detail.notFound}</h2>
        <p>{t.detail.notFoundText}</p>
        <div className={panel.row}>
          <Button href={listHref}>{t.detail.back}</Button>
          {!session && (
            <Button href={`/${lang}/sign-in`} variant="ghost">
              {t.signInRequired.button}
            </Button>
          )}
        </div>
      </section>
    );
  }

  const territory = territories.find((item) => item.id === application.form.territoryId)?.name;
  const rows: [string, string][] = [
    [t.detail.service, application.serviceTitle],
    [t.detail.owner, application.ownerName],
    [t.detail.territory, territory ?? "—"],
    [t.detail.address, application.form.address],
    [
      t.detail.documents,
      application.form.attached.length === 0
        ? "—"
        : application.form.attached
            .map((key) => dict.serviceDetails.documents.items[key])
            .join(", "),
    ],
    ...(application.form.comment
      ? ([[t.detail.comment, application.form.comment]] as [string, string][])
      : []),
  ];

  return (
    <div className={styles.detail}>
      {back}
      {justCreated && (
        <p className={panel.notice} role="status">
          {t.detail.created}
        </p>
      )}
      <header className={styles.detailHead}>
        <div>
          <p className={styles.meta}>
            {t.detail.number} {application.number}
          </p>
          <h2 className={panel.heading}>{application.serviceTitle}</h2>
        </div>
        <StatusBadge status={application.status} label={dict.status[application.status]} />
      </header>

      <dl className={panel.summary}>
        {rows.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {mode === "operator" && (
        <StatusForm application={application} labels={dict.operator.change} />
      )}

      <section>
        <h3 className={styles.sub}>{t.detail.history}</h3>
        <ol className={styles.history}>
          {application.history.map((entry, index) => (
            <li key={`${entry.at}-${index}`}>
              <StatusBadge status={entry.status} label={dict.status[entry.status]} />
              <span className={styles.meta}>{formatStamp(entry.at, lang)}</span>
              {entry.note && <span>{entry.note}</span>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
