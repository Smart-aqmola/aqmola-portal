"use client";

import { useState } from "react";
import type { ProviderInfo } from "@/features/account/domain/availability";
import { useAllProperties } from "@/features/account/ui/use-properties";
import { readingStatuses, type ReadingStatus } from "@/features/meters/domain/reading";
import { ReadingProviderPanel } from "@/features/meters/ui/readings-history";
import { ReadingBadge } from "@/features/meters/ui/status-badges";
import { meterLabel, readingText } from "@/features/meters/ui/meter-texts";
import { useAllMeterData } from "@/features/meters/ui/use-meter-data";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import { Field } from "@/shared/ui/field/field";
import { readingsOf } from "../domain/scope";
import { OperatorArea, type OperatorContext, type OperatorDict } from "./operator-area";
import styles from "./organization.module.css";

type Props = { lang: Locale; dict: OperatorDict; providers: readonly ProviderInfo[] };

/** Readings sent by residents in the area of the organization: accept, reject, ask to clarify (spec 12.2). */
export function OperatorReadings(props: Props) {
  return (
    <OperatorArea {...props} current="readings">
      {(context) => <Register {...props} context={context} />}
    </OperatorArea>
  );
}

function Register({ lang, dict, context }: Props & { context: OperatorContext }) {
  const t = dict.cabinet.readings;
  const c = dict.cabinet.common;
  const data = useAllMeterData();
  const properties = useAllProperties();
  const [status, setStatus] = useState<ReadingStatus | "">("");
  const [query, setQuery] = useState("");

  const mine = readingsOf(context.org, data.readings, data.meters, properties);
  const text = query.trim().toLowerCase();
  const meterOf = (id: string) => data.meters.find((item) => item.id === id);
  const shown = mine
    .filter((item) => !status || item.status === status)
    .filter(
      (item) =>
        !text ||
        item.number.toLowerCase().includes(text) ||
        (meterOf(item.meterId)?.address ?? "").toLowerCase().includes(text),
    )
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

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
                  onChange={(event) => setStatus(event.target.value as ReadingStatus | "")}
                >
                  <option value="">{c.all}</option>
                  {readingStatuses
                    .filter((item) => mine.some((entry) => entry.status === item))
                    .map((item) => (
                      <option key={item} value={item}>
                        {dict.meters.status[item]}
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
            <ul className={styles.items}>
              {shown.map((reading) => {
                const meter = meterOf(reading.meterId);
                const decimals = meter?.decimals ?? 3;
                return (
                  <li key={reading.id}>
                    <article className={styles.item} aria-label={reading.number}>
                      <div className={styles.detailHead}>
                        <h3 className={styles.itemTitle}>
                          {meter ? meterLabel(meter, dict) : reading.number}
                        </h3>
                        <ReadingBadge
                          status={reading.status}
                          label={dict.meters.status[reading.status]}
                        />
                      </div>
                      <dl className={styles.facts}>
                        <div>
                          <dt>{t.fields.number}</dt>
                          <dd>{reading.number}</dd>
                        </div>
                        <div>
                          <dt>{t.fields.address}</dt>
                          <dd>{meter?.address ?? c.noValue}</dd>
                        </div>
                        <div>
                          <dt>{t.fields.value}</dt>
                          <dd>{readingText(reading.value, decimals)}</dd>
                        </div>
                        <div>
                          <dt>{t.fields.previous}</dt>
                          <dd>{readingText(reading.previousValue, decimals)}</dd>
                        </div>
                        <div>
                          <dt>{t.fields.date}</dt>
                          <dd>
                            {formatDate(reading.readingDate.slice(0, 10), lang)}{" "}
                            {reading.readingDate.slice(0, 4)}
                          </dd>
                        </div>
                        <div>
                          <dt>{t.fields.photo}</dt>
                          <dd>{reading.photo?.name ?? t.noPhoto}</dd>
                        </div>
                      </dl>
                      <ReadingProviderPanel
                        dict={dict}
                        reading={reading}
                        onChange={data.replaceReading}
                        onDone={({ from, to, note }) =>
                          context.record({
                            entity: "reading",
                            entityId: reading.id,
                            number: reading.number,
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
        </>
      )}
    </>
  );
}
