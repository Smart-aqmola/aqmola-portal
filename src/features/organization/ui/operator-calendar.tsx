"use client";

import type { ProviderInfo } from "@/features/account/domain/availability";
import { useAllProperties } from "@/features/account/ui/use-properties";
import type { MeterRequest } from "@/features/meters/domain/meter-request";
import { useAllMeterData } from "@/features/meters/ui/use-meter-data";
import { slotText } from "@/features/meters/ui/requests-list";
import type { Locale } from "@/shared/i18n/config";
import { formatDate } from "@/shared/i18n/format-date";
import { requestsOf } from "../domain/scope";
import { OperatorArea, type OperatorContext, type OperatorDict } from "./operator-area";
import styles from "./organization-styles";

type Props = { lang: Locale; dict: OperatorDict; providers: readonly ProviderInfo[] };

/** The calendar of work: planned visits by day, and requests waiting for a date (spec 12.6). */
export function OperatorCalendar(props: Props) {
  return (
    <OperatorArea {...props} current="calendar">
      {(context) => <Calendar {...props} context={context} />}
    </OperatorArea>
  );
}

function groupByDay(items: readonly MeterRequest[]) {
  const days = new Map<string, MeterRequest[]>();
  for (const item of items) {
    const date = item.scheduled?.date ?? "";
    days.set(date, [...(days.get(date) ?? []), item]);
  }
  return [...days.entries()];
}

function Calendar({ lang, dict, context }: Props & { context: OperatorContext }) {
  const t = dict.cabinet.calendar;
  const data = useAllMeterData();
  const properties = useAllProperties();
  const today = new Date().toISOString().slice(0, 10);

  const mine = requestsOf(context.org, data.requests, properties);
  const planned = mine.filter((item) => item.status === "scheduled" && item.scheduled);
  const waiting = mine.filter((item) => item.status === "in_progress");
  const upcoming = groupByDay(
    planned
      .filter((item) => (item.scheduled?.date ?? "") >= today)
      .sort((a, b) => (a.scheduled?.date ?? "").localeCompare(b.scheduled?.date ?? "")),
  );
  const past = groupByDay(
    planned
      .filter((item) => (item.scheduled?.date ?? "") < today)
      .sort((a, b) => (b.scheduled?.date ?? "").localeCompare(a.scheduled?.date ?? "")),
  );

  const visit = (request: MeterRequest) => (
    <li key={request.id} className={styles.visit}>
      <strong>
        {request.scheduled ? slotText(request.scheduled, lang, dict) : ""} ·{" "}
        {dict.meters.nav[request.kind]}
      </strong>
      <span>
        {request.number} · {request.address}
      </span>
      <span>
        {t.assignee}: {request.assignee ?? dict.cabinet.common.noValue}
      </span>
    </li>
  );

  const days = (groups: [string, MeterRequest[]][]) => (
    <ul className={styles.agenda}>
      {groups.map(([date, items]) => (
        <li key={date} className={styles.day}>
          <h4 className={styles.dayTitle}>
            {formatDate(date, lang)} {date.slice(0, 4)}
          </h4>
          <ul className={styles.items}>{items.map(visit)}</ul>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <div>
        <h2 className={styles.sectionTitle}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>
      {planned.length === 0 ? <p>{t.empty}</p> : days(upcoming)}
      <section aria-labelledby="waiting-title">
        <h3 id="waiting-title" className={styles.objectTitle}>
          {t.unscheduled}
        </h3>
        {waiting.length === 0 ? (
          <p>{t.unscheduledNone}</p>
        ) : (
          <ul className={styles.items}>
            {waiting.map((request) => (
              <li key={request.id} className={styles.visit}>
                <strong>
                  {dict.meters.nav[request.kind]} · {request.number}
                </strong>
                <span>{request.address}</span>
                <span>
                  {t.wishes}: {request.slots.map((slot) => slotText(slot, lang, dict)).join("; ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {past.length > 0 && (
        <section aria-labelledby="past-title">
          <h3 id="past-title" className={styles.objectTitle}>
            {t.past}
          </h3>
          {days(past)}
        </section>
      )}
    </>
  );
}
