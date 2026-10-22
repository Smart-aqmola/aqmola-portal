"use client";

import { ShowMoreList } from "@/shared/ui/show-more/show-more";
import { useState } from "react";
import type { ProviderInfo } from "@/features/account/domain/availability";
import { appealStatuses, type AppealStatus } from "@/features/appeals/domain/appeal";
import { AppealBadge } from "@/features/appeals/ui/appeal-badge";
import { ExecutorPanel } from "@/features/appeals/ui/appeal-detail";
import { useAllAppeals } from "@/features/appeals/ui/use-appeals";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import { Field } from "@/shared/ui/field/field";
import { appealsOf } from "../domain/scope";
import { OperatorArea, type OperatorContext, type OperatorDict } from "./operator-area";
import styles from "./organization.module.css";

type Props = { lang: Locale; dict: OperatorDict; providers: readonly ProviderInfo[] };

/** Appeals sent to the organization: accept, ask, answer, redirect, close (spec 12.2, 11.7). */
export function OperatorAppeals(props: Props) {
  return (
    <OperatorArea {...props} current="appeals">
      {(context) => <Register {...props} context={context} />}
    </OperatorArea>
  );
}

function Register({ lang, dict, context }: Props & { context: OperatorContext }) {
  const t = dict.cabinet.appeals;
  const c = dict.cabinet.common;
  const { all, replace } = useAllAppeals();
  const [status, setStatus] = useState<AppealStatus | "">("");
  const [query, setQuery] = useState("");

  const mine = appealsOf(context.org, all);
  const text = query.trim().toLowerCase();
  const shown = mine
    .filter((item) => !status || item.status === status)
    .filter(
      (item) =>
        !text ||
        item.number.toLowerCase().includes(text) ||
        item.address.toLowerCase().includes(text),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <div>
        <h2 className={styles.sectionTitle}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>
      {mine.length === 0 ? (
        <p>{c.noItems}</p>
      ) : (
        <>
          <div className={styles.listTools}>
            <Field label={c.status}>
              {(control) => (
                <select
                  {...control}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as AppealStatus | "")}
                >
                  <option value="">{c.all}</option>
                  {appealStatuses
                    .filter((item) => mine.some((entry) => entry.status === item))
                    .map((item) => (
                      <option key={item} value={item}>
                        {dict.appeals.status[item]}
                      </option>
                    ))}
                </select>
              )}
            </Field>
            <Field label={c.search}>
              {(control) => (
                <input
                  {...control}
                  type="search"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              )}
            </Field>
          </div>
          <p className={styles.note} aria-live="polite">
            {format(c.count, { n: shown.length })}
          </p>
          {shown.length === 0 ? (
            <p>{c.noMatch}</p>
          ) : (
            <ShowMoreList items={shown} labels={dict.list}>
              {(visible) => (
                <ul className={styles.items}>
                  {visible.map((appeal) => {
                    const title = dict.appeals.categories[appeal.category];
                    return (
                      <li key={appeal.id}>
                        <article className={styles.item} aria-label={`${title}, ${appeal.number}`}>
                          <div className={styles.detailHead}>
                            <h3 className={styles.itemTitle}>{title}</h3>
                            <AppealBadge
                              status={appeal.status}
                              label={dict.appeals.status[appeal.status]}
                            />
                          </div>
                          <dl className={styles.facts}>
                            <div>
                              <dt>{t.fields.number}</dt>
                              <dd>{appeal.number}</dd>
                            </div>
                            <div>
                              <dt>{t.fields.address}</dt>
                              <dd>{appeal.address}</dd>
                            </div>
                            <div>
                              <dt>{t.fields.phone}</dt>
                              <dd>{appeal.contactPhone}</dd>
                            </div>
                            <div>
                              <dt>{t.fields.created}</dt>
                              <dd>
                                {formatDate(appeal.createdAt.slice(0, 10), lang)}{" "}
                                {appeal.createdAt.slice(0, 4)}
                              </dd>
                            </div>
                            <div>
                              <dt>{t.fields.description}</dt>
                              <dd>{appeal.description}</dd>
                            </div>
                          </dl>
                          <details className={styles.details}>
                            <summary>{t.fields.thread}</summary>
                            <ul className={styles.timeline}>
                              {appeal.events.map((event, index) => (
                                <li key={`${event.at}-${index}`}>
                                  <span>
                                    {event.at.slice(0, 10)} {event.at.slice(11, 16)}
                                  </span>
                                  {event.status && (
                                    <AppealBadge
                                      status={event.status}
                                      label={dict.appeals.status[event.status]}
                                    />
                                  )}
                                  {event.text && <span>{event.text}</span>}
                                </li>
                              ))}
                            </ul>
                          </details>
                          <ExecutorPanel
                            dict={dict}
                            appeal={appeal}
                            onChange={replace}
                            onDone={({ from, to, note }) =>
                              context.record({
                                entity: "appeal",
                                entityId: appeal.id,
                                number: appeal.number,
                                action: "status",
                                from,
                                to,
                                note,
                              })
                            }
                          />
                        </article>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ShowMoreList>
          )}
        </>
      )}
    </>
  );
}
