"use client";

import { ShowMoreList } from "@/shared/ui/show-more/show-more";
import { useState } from "react";
import type { ProviderInfo } from "@/features/account/domain/availability";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import { Field } from "@/shared/ui/field/field";
import { auditEntities, type AuditEntity, type AuditEntry } from "../domain/audit";
import { OperatorArea, type OperatorContext, type OperatorDict } from "./operator-area";
import { useAudit } from "./use-audit";
import styles from "./organization-styles";

type Props = { lang: Locale; dict: OperatorDict; providers: readonly ProviderInfo[] };

/** The journal of what the staff did to statuses, readings and accounts (spec 12.7). */
export function OperatorAudit(props: Props) {
  return (
    <OperatorArea {...props} current="audit">
      {(context) => <Journal {...props} context={context} />}
    </OperatorArea>
  );
}

function statusName(entry: AuditEntry, key: string | undefined, dict: OperatorDict): string {
  if (!key) return dict.cabinet.common.noValue;
  if (entry.action === "account") return key;
  const names: Record<AuditEntity, Record<string, string>> = {
    service_application: dict.status,
    contract: dict.contracts.status,
    meter_request: dict.meters.requestStatus,
    reading: dict.meters.status,
    appeal: dict.appeals.status,
    config: {},
  };
  return names[entry.entity][key] ?? key;
}

function Journal({ lang, dict, context }: Props & { context: OperatorContext }) {
  const t = dict.cabinet.audit;
  const f = t.fields;
  const { entries } = useAudit();
  const [entity, setEntity] = useState<AuditEntity | "">("");

  const mine = entries.filter((item) => item.organizationId === context.org.id);
  const shown = mine.filter((item) => !entity || item.entity === entity);

  return (
    <>
      <div>
        <h2 className={styles.sectionTitle}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>
      {mine.length === 0 ? (
        <p>{t.empty}</p>
      ) : (
        <>
          <div className={styles.listTools}>
            <Field label={t.filter}>
              {(control) => (
                <select
                  {...control}
                  value={entity}
                  onChange={(event) => setEntity(event.target.value as AuditEntity | "")}
                >
                  <option value="">{dict.cabinet.common.all}</option>
                  {auditEntities
                    .filter((item) => mine.some((entry) => entry.entity === item))
                    .map((item) => (
                      <option key={item} value={item}>
                        {t.entities[item]}
                      </option>
                    ))}
                </select>
              )}
            </Field>
          </div>
          <p className={styles.note} aria-live="polite">
            {format(dict.cabinet.common.count, { n: shown.length })}
          </p>
          <div className={styles.scroll}>
            <ShowMoreList items={shown} labels={dict.list}>
              {(visible) => (
                <table className={styles.table}>
                  <caption className="visually-hidden">{t.title}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{f.at}</th>
                      <th scope="col">{f.actor}</th>
                      <th scope="col">{f.entity}</th>
                      <th scope="col">{f.action}</th>
                      <th scope="col">{f.change}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          {formatDate(entry.at.slice(0, 10), lang)} {entry.at.slice(0, 4)},{" "}
                          {entry.at.slice(11, 16)} UTC
                        </td>
                        <td>{entry.actor}</td>
                        <td>
                          {t.entities[entry.entity]}
                          <span className={styles.note}> {entry.number}</span>
                        </td>
                        <td>{t.actions[entry.action]}</td>
                        <td>
                          {format(t.change, {
                            from: statusName(entry, entry.from, dict),
                            to: statusName(entry, entry.to, dict),
                          })}
                          {entry.note && <span className={styles.note}> · {entry.note}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ShowMoreList>
          </div>
        </>
      )}
    </>
  );
}
