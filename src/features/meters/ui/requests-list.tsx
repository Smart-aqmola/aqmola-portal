"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import {
  requestKinds,
  requestStatuses,
  type MeterRequest,
  type RequestKind,
  type RequestStatus,
} from "../domain/meter-request";
import { MetersArea, type MetersContext, type MetersDict } from "./meters-area";
import { day, meterLabel } from "./meter-texts";
import { RequestBadge } from "./status-badges";
import styles from "./meters.module.css";

type RequestsListProps = {
  lang: Locale;
  dict: MetersDict;
  territories: { id: string; name: string }[];
};

/** The part "My requests for meters": all six kinds in one list, with their status (spec 6.2, 8.9). */
export function RequestsList(props: RequestsListProps) {
  const { lang, dict, territories } = props;
  return (
    <MetersArea
      lang={lang}
      dict={dict}
      territories={territories}
      current="requests"
      here={`/${lang}/meters/requests`}
    >
      {(context) => <List {...props} context={context} />}
    </MetersArea>
  );
}

export function slotText(
  slot: { date: string; time: "morning" | "day" | "evening" },
  lang: Locale,
  dict: MetersDict,
): string {
  return format(dict.meters.requestDetail.slotLine, {
    date: day(slot.date, lang, ""),
    time: dict.meters.request.times[slot.time],
  });
}

function List({ lang, dict, context }: RequestsListProps & { context: MetersContext }) {
  const { data } = context;
  const t = dict.meters.requests;
  const f = t.fields;
  const [kind, setKind] = useState<RequestKind | "">("");
  const [status, setStatus] = useState<RequestStatus | "">("");

  if (data.requests.length === 0) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{t.empty.title}</h2>
        <p>{t.empty.text}</p>
        <div>
          <Button href={`/${lang}/meters`}>{t.empty.button}</Button>
        </div>
      </section>
    );
  }

  const meterOf = (request: MeterRequest) =>
    data.meters.find((item) => item.id === request.meterId);
  const shown = [...data.requests]
    .filter((item) => (!kind || item.kind === kind) && (!status || item.status === status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <div>
        <h2 className={styles.heading}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>
      <div className={styles.listTools}>
        <Field label={t.filterKind}>
          {(control) => (
            <select
              {...control}
              value={kind}
              onChange={(event) => setKind(event.target.value as RequestKind | "")}
            >
              <option value="">{t.all}</option>
              {requestKinds.map((item) => (
                <option key={item} value={item}>
                  {dict.meters.nav[item]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t.filterStatus}>
          {(control) => (
            <select
              {...control}
              value={status}
              onChange={(event) => setStatus(event.target.value as RequestStatus | "")}
            >
              <option value="">{t.all}</option>
              {requestStatuses
                .filter((item) => data.requests.some((request) => request.status === item))
                .map((item) => (
                  <option key={item} value={item}>
                    {dict.meters.requestStatus[item]}
                  </option>
                ))}
            </select>
          )}
        </Field>
      </div>
      <p className={styles.note} aria-live="polite">
        {format(t.count, { n: shown.length })}
      </p>
      <ul className={styles.items}>
        {shown.map((request) => {
          const meter = meterOf(request);
          const title = dict.meters.nav[request.kind];
          return (
            <li key={request.id}>
              <article className={styles.item} aria-label={`${title}, ${request.number}`}>
                <div className={styles.detailHead}>
                  <h3 className={styles.itemTitle}>{title}</h3>
                  <RequestBadge
                    status={request.status}
                    label={dict.meters.requestStatus[request.status]}
                  />
                </div>
                <dl className={styles.facts}>
                  <div>
                    <dt>{f.number}</dt>
                    <dd>{request.number}</dd>
                  </div>
                  <div>
                    <dt>{f.object}</dt>
                    <dd>{request.address}</dd>
                  </div>
                  <div>
                    <dt>{f.meter}</dt>
                    <dd>
                      {meter
                        ? meterLabel(meter, dict)
                        : `${dict.meters.resources[request.resource]}. ${t.noMeter}`}
                    </dd>
                  </div>
                  <div>
                    <dt>{f.created}</dt>
                    <dd>{day(request.createdAt, lang, "")}</dd>
                  </div>
                  <div>
                    <dt>{f.scheduled}</dt>
                    <dd>
                      {request.scheduled ? slotText(request.scheduled, lang, dict) : t.notYet}
                    </dd>
                  </div>
                  <div>
                    <dt>{f.assignee}</dt>
                    <dd>{request.assignee ?? t.notYet}</dd>
                  </div>
                </dl>
                <div>
                  <Link href={`/${lang}/meters/requests/${request.id}`} className={styles.open}>
                    {t.open}
                    <span className="visually-hidden">
                      {" "}
                      — {title}, {request.number}
                    </span>
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </>
  );
}
