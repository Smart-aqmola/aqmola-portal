"use client";

import { ShowMoreList } from "@/shared/ui/show-more/show-more";
import Link from "next/link";
import { useState } from "react";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import {
  appealStatuses,
  awaitsApplicant,
  lastExecutorText,
  type AppealStatus,
} from "../domain/appeal";
import { AppealBadge } from "./appeal-badge";
import { AppealsArea, type AppealsAreaProps, type AppealsContext } from "./appeals-area";
import styles from "@/shared/ui/cabinet/cabinet.module.css";

/** The page "my appeals": every appeal with its status and the organization's answer. */
export function AppealsList(props: AppealsAreaProps) {
  const { lang } = props;
  return (
    <AppealsArea {...props} here={`/${lang}/appeals`}>
      {(context) => <List {...props} context={context} />}
    </AppealsArea>
  );
}

function List({ lang, dict, context }: AppealsAreaProps & { context: AppealsContext }) {
  const t = dict.appeals.list;
  const f = t.fields;
  const { appeals } = context;
  const [filter, setFilter] = useState<AppealStatus | "">("");

  if (appeals.mine.length === 0) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{t.empty.title}</h2>
        <p>{t.empty.text}</p>
        <div>
          <Button href={`/${lang}/appeals/new`}>{t.empty.button}</Button>
        </div>
      </section>
    );
  }

  const shown = [...appeals.mine]
    .filter((item) => !filter || item.status === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <div className={styles.listTools}>
        <Button href={`/${lang}/appeals/new`}>{t.add}</Button>
        <Field label={t.filter}>
          {(control) => (
            <select
              {...control}
              value={filter}
              onChange={(event) => setFilter(event.target.value as AppealStatus | "")}
            >
              <option value="">{t.all}</option>
              {appealStatuses
                .filter((status) => appeals.mine.some((item) => item.status === status))
                .map((status) => (
                  <option key={status} value={status}>
                    {dict.appeals.status[status]}
                  </option>
                ))}
            </select>
          )}
        </Field>
      </div>
      <p className={styles.note} aria-live="polite">
        {format(t.count, { n: shown.length })}
      </p>
      <ShowMoreList items={shown} labels={dict.list}>
        {(visible) => (
          <ul className={styles.items}>
            {visible.map((item) => {
              const answer = lastExecutorText(item);
              const title = dict.appeals.categories[item.category];
              return (
                <li key={item.id}>
                  <article className={styles.item} aria-label={`${title}, ${item.number}`}>
                    <div className={styles.detailHead}>
                      <h3 className={styles.itemTitle}>{title}</h3>
                      <AppealBadge status={item.status} label={dict.appeals.status[item.status]} />
                    </div>
                    {awaitsApplicant(item) && <p className={styles.problems}>{t.needsReply}</p>}
                    <dl className={styles.facts}>
                      <div>
                        <dt>{f.number}</dt>
                        <dd>{item.number}</dd>
                      </div>
                      <div>
                        <dt>{f.created}</dt>
                        <dd>
                          {formatDate(item.createdAt.slice(0, 10), lang)}{" "}
                          {item.createdAt.slice(0, 4)}
                        </dd>
                      </div>
                      <div>
                        <dt>{f.object}</dt>
                        <dd>{item.address}</dd>
                      </div>
                      <div>
                        <dt>{f.organization}</dt>
                        <dd>{item.organizationName}</dd>
                      </div>
                      {answer && (
                        <div>
                          <dt>{f.answer}</dt>
                          <dd>{answer}</dd>
                        </div>
                      )}
                    </dl>
                    <div>
                      <Link href={`/${lang}/appeals/${item.id}`} className={styles.open}>
                        {t.open}
                        <span className="visually-hidden">
                          {" "}
                          — {title}, {item.number}
                        </span>
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </ShowMoreList>
    </>
  );
}
