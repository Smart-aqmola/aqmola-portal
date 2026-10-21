"use client";

import { useState } from "react";
import type { ProviderInfo } from "@/features/account/domain/availability";
import {
  auditEntities,
  type AuditEntity,
  type AuditEntry,
} from "@/features/organization/domain/audit";
import { useAudit } from "@/features/organization/ui/use-audit";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import { Field } from "@/shared/ui/field/field";
import { AdminArea, type AdminDict } from "./admin-area";
import styles from "./admin.module.css";

type Props = { lang: Locale; dict: AdminDict; providers: readonly ProviderInfo[] };

/** Every record of the portal: changes of settings and the work of the staff of organizations (spec 13.4, 19.7). */
export function AdminAudit(props: Props) {
  return (
    <AdminArea lang={props.lang} dict={props.dict} current="audit">
      {() => <Journal {...props} />}
    </AdminArea>
  );
}

function statusName(entry: AuditEntry, key: string | undefined, dict: AdminDict): string {
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

function Journal({ lang, dict, providers }: Props) {
  const t = dict.admin.audit;
  const a = dict.cabinet.audit;
  const { entries } = useAudit();
  const [organization, setOrganization] = useState("");
  const [entity, setEntity] = useState<AuditEntity | "">("");

  const shown = entries.filter(
    (item) =>
      (!organization || item.organizationId === organization) &&
      (!entity || item.entity === entity),
  );
  const orgName = (id: string) =>
    id === "portal" ? t.portal : (providers.find((item) => item.id === id)?.name ?? id);

  return (
    <>
      <div>
        <h2 className={styles.sectionTitle}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>
      <div className={styles.listTools}>
        <Field label={t.organization}>
          {(control) => (
            <select
              {...control}
              value={organization}
              onChange={(event) => setOrganization(event.target.value)}
            >
              <option value="">{dict.cabinet.common.all}</option>
              <option value="portal">{t.portal}</option>
              {providers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={a.filter}>
          {(control) => (
            <select
              {...control}
              value={entity}
              onChange={(event) => setEntity(event.target.value as AuditEntity | "")}
            >
              <option value="">{dict.cabinet.common.all}</option>
              {auditEntities.map((item) => (
                <option key={item} value={item}>
                  {a.entities[item]}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <p className={styles.note} aria-live="polite">
        {format(dict.cabinet.common.count, { n: shown.length })}
      </p>
      {shown.length === 0 ? (
        <p>{a.empty}</p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <caption className="visually-hidden">{t.title}</caption>
            <thead>
              <tr>
                <th scope="col">{a.fields.at}</th>
                <th scope="col">{a.fields.actor}</th>
                <th scope="col">{t.organization}</th>
                <th scope="col">{a.fields.entity}</th>
                <th scope="col">{a.fields.change}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    {formatDate(entry.at.slice(0, 10), lang)} {entry.at.slice(0, 4)},{" "}
                    {entry.at.slice(11, 16)} UTC
                  </td>
                  <td>{entry.actor}</td>
                  <td>{orgName(entry.organizationId)}</td>
                  <td>
                    {a.entities[entry.entity]}
                    <span className={styles.note}> {entry.number}</span>
                  </td>
                  <td>
                    {entry.action === "config"
                      ? format(t.changed, { names: entry.note ?? "" })
                      : format(a.change, {
                          from: statusName(entry, entry.from, dict),
                          to: statusName(entry, entry.to, dict),
                        })}
                    {entry.action !== "config" && entry.note && (
                      <span className={styles.note}> · {entry.note}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
