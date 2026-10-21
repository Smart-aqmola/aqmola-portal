"use client";

import { useState } from "react";
import type { ProviderInfo } from "@/features/account/domain/availability";
import { requestStatuses, type RequestStatus } from "@/features/meters/domain/meter-request";
import { RequestProviderPanel } from "@/features/meters/ui/request-detail";
import { slotText } from "@/features/meters/ui/requests-list";
import { RequestBadge } from "@/features/meters/ui/status-badges";
import { useAllMeterData } from "@/features/meters/ui/use-meter-data";
import { useAllProperties } from "@/features/account/ui/use-properties";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import { Field } from "@/shared/ui/field/field";
import { requestsOf } from "../domain/scope";
import { OperatorArea, type OperatorContext, type OperatorDict } from "./operator-area";
import styles from "./organization.module.css";

type Props = { lang: Locale; dict: OperatorDict; providers: readonly ProviderInfo[] };

/** Requests for work on meters in the area of the organization: assign, plan, record the result (spec 12.2, 12.6). */
export function OperatorMeters(props: Props) {
  return (
    <OperatorArea {...props} current="meters">
      {(context) => <Register {...props} context={context} />}
    </OperatorArea>
  );
}

function Register({ lang, dict, context }: Props & { context: OperatorContext }) {
  const t = dict.cabinet.meters;
  const c = dict.cabinet.common;
  const data = useAllMeterData();
  const properties = useAllProperties();
  const [status, setStatus] = useState<RequestStatus | "">("");
  const [query, setQuery] = useState("");

  const mine = requestsOf(context.org, data.requests, properties);
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
                  onChange={(event) => setStatus(event.target.value as RequestStatus | "")}
                >
                  <option value="">{c.all}</option>
                  {requestStatuses
                    .filter((item) => mine.some((entry) => entry.status === item))
                    .map((item) => (
                      <option key={item} value={item}>
                        {dict.meters.requestStatus[item]}
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
              {shown.map((request) => {
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
                          <dt>{t.fields.number}</dt>
                          <dd>{request.number}</dd>
                        </div>
                        <div>
                          <dt>{t.fields.address}</dt>
                          <dd>{request.address}</dd>
                        </div>
                        <div>
                          <dt>{t.fields.phone}</dt>
                          <dd>{request.contactPhone}</dd>
                        </div>
                        <div>
                          <dt>{t.fields.created}</dt>
                          <dd>
                            {formatDate(request.createdAt.slice(0, 10), lang)}{" "}
                            {request.createdAt.slice(0, 4)}
                          </dd>
                        </div>
                        <div>
                          <dt>{t.fields.slots}</dt>
                          <dd>
                            {request.slots.map((slot) => slotText(slot, lang, dict)).join("; ")}
                          </dd>
                        </div>
                        <div>
                          <dt>{t.fields.scheduled}</dt>
                          <dd>
                            {request.scheduled ? slotText(request.scheduled, lang, dict) : t.notYet}
                          </dd>
                        </div>
                        <div>
                          <dt>{t.fields.assignee}</dt>
                          <dd>{request.assignee ?? t.notYet}</dd>
                        </div>
                      </dl>
                      <RequestProviderPanel
                        dict={dict}
                        request={request}
                        meters={data.meters}
                        onRequest={data.replaceRequest}
                        onMeters={data.saveMeters}
                        onDone={({ from, to, note }) =>
                          context.record({
                            entity: "meter_request",
                            entityId: request.id,
                            number: request.number,
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
