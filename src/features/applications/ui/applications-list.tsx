"use client";

import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { StatusBadge } from "./status-badge";
import { useApplications } from "./use-applications";
import { useSession } from "./use-session";
import styles from "./applications.module.css";
import panel from "./panel.module.css";

type Props = {
  lang: Locale;
  dict: Pick<Dictionary, "applications" | "status">;
};

export function ApplicationsList({ lang, dict }: Props) {
  const { session, ready } = useSession();
  const { applications } = useApplications();
  const t = dict.applications;

  if (!ready) return <div className={panel.placeholder} aria-hidden="true" />;

  if (!session) {
    return (
      <section className={panel.card}>
        <h2 className={panel.heading}>{t.signInRequired.title}</h2>
        <p>{t.signInRequired.text}</p>
        <div>
          <Button href={`/${lang}/sign-in`}>{t.signInRequired.button}</Button>
        </div>
      </section>
    );
  }

  if (session.role === "operator") {
    return (
      <section className={panel.card}>
        <p>{t.otherRole}</p>
      </section>
    );
  }

  const mine = applications.filter((item) => item.ownerRole === session.role);

  if (mine.length === 0) {
    return (
      <section className={panel.card}>
        <h2 className={panel.heading}>{t.empty.title}</h2>
        <p>{t.empty.text}</p>
        <div>
          <Button href={`/${lang}/services`}>{t.empty.button}</Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <p className={styles.meta}>{format(t.lead, { name: session.name })}</p>
      <h2 className="visually-hidden">{t.list}</h2>
      <ul className={styles.list}>
        {mine.map((item) => (
          <li key={item.number}>
            <article className={styles.item}>
              <div className={styles.main}>
                <h3 className={styles.title}>{item.serviceTitle}</h3>
                <p className={styles.meta}>
                  {item.number} ·{" "}
                  {format(t.submittedOn, { date: formatDate(item.createdAt.slice(0, 10), lang) })}
                </p>
              </div>
              <StatusBadge status={item.status} label={dict.status[item.status]} />
              <Link href={`/${lang}/applications/${item.number}`} className={styles.open}>
                {t.open}
                <span className={styles.visuallyHidden}> {item.number}</span>
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
