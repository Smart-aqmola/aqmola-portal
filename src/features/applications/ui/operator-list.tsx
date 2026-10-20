"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { buildSamples, countByStatus, forOrganization } from "../domain/operator";
import { statuses, type ApplicationStatus } from "../domain/status";
import { StatusBadge } from "./status-badge";
import { useApplications } from "./use-applications";
import { useSession } from "./use-session";
import styles from "./applications.module.css";
import panel from "./panel.module.css";

type Props = {
  lang: Locale;
  dict: Pick<Dictionary, "operator" | "applications" | "status">;
  organizations: { id: string; name: string }[];
  /** A few services of each organization, used to make test applications. */
  sampleServices: Record<string, { slug: string; title: string }[]>;
};

export function OperatorList({ lang, dict, organizations, sampleServices }: Props) {
  const { session, ready } = useSession();
  const { applications, addMany } = useApplications();
  const [filter, setFilter] = useState<ApplicationStatus | "all">("all");
  const t = dict.operator;

  if (!ready) return <div className={panel.placeholder} aria-hidden="true" />;

  if (!session || session.role !== "operator" || !session.organizationId) {
    return (
      <section className={panel.card}>
        <h2 className={panel.heading}>{t.signInRequired.title}</h2>
        <p>{session ? t.notOperator : t.signInRequired.text}</p>
        <div>
          <Button href={`/${lang}/sign-in`}>{t.signInRequired.button}</Button>
        </div>
      </section>
    );
  }

  const organizationId = session.organizationId;
  const organization = organizations.find((item) => item.id === organizationId);
  const mine = forOrganization(applications, organizationId);
  const counts = countByStatus(mine);
  const shown = filter === "all" ? mine : mine.filter((item) => item.status === filter);

  function addSamples() {
    addMany((existing) =>
      buildSamples({
        organizationId,
        services: sampleServices[organizationId] ?? [],
        existing,
        now: new Date(),
      }),
    );
  }

  return (
    <div className={styles.detail}>
      <p className={styles.meta}>{format(t.lead, { org: organization?.name ?? organizationId })}</p>

      {mine.length === 0 ? (
        <section className={panel.card}>
          <h2 className={panel.heading}>{t.empty.title}</h2>
          <p>{t.empty.text}</p>
          <div>
            <Button onClick={addSamples}>{t.empty.button}</Button>
          </div>
        </section>
      ) : (
        <>
          <div className={panel.row} role="group" aria-label={t.filter}>
            {(["all", ...statuses] as const).map((value) => (
              <Button
                key={value}
                variant={filter === value ? "primary" : "light"}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value === "all" ? t.all : dict.status[value]} (
                {value === "all" ? mine.length : counts[value]})
              </Button>
            ))}
          </div>
          <p className={styles.meta} role="status">
            {format(t.count, { n: shown.length })}
          </p>
          {shown.length === 0 ? (
            <p>{t.noneInFilter}</p>
          ) : (
            <>
              <h2 className="visually-hidden">{dict.applications.list}</h2>
              <ul className={styles.list}>
                {shown.map((item) => (
                  <li key={item.number}>
                    <article className={styles.item}>
                      <div className={styles.main}>
                        <h3 className={styles.title}>{item.serviceTitle}</h3>
                        <p className={styles.meta}>
                          {item.number} · {t.from} {item.ownerName} ·{" "}
                          {format(dict.applications.submittedOn, {
                            date: formatDate(item.createdAt.slice(0, 10), lang),
                          })}
                        </p>
                      </div>
                      <StatusBadge status={item.status} label={dict.status[item.status]} />
                      <Link href={`/${lang}/operator/${item.number}`} className={styles.open}>
                        {dict.applications.open}
                        <span className={styles.visuallyHidden}> {item.number}</span>
                      </Link>
                    </article>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
