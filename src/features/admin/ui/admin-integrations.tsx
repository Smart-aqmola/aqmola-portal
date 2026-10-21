"use client";

import { useState } from "react";
import type { ProviderInfo } from "@/features/account/domain/availability";
import type { Locale } from "@/shared/i18n/config";
import { formatDate } from "@/shared/i18n/format-date";
import { integrationLog } from "../domain/integrations";
import { AdminArea, type AdminDict } from "./admin-area";
import styles from "./admin.module.css";

type Props = { lang: Locale; dict: AdminDict; providers: readonly ProviderInfo[] };

const TONES = { available: "done", degraded: "work", unavailable: "problem" } as const;

/** Availability of the connected systems and the journal of exchange errors (spec 13.2, 17.1). */
export function AdminIntegrations(props: Props) {
  return (
    <AdminArea lang={props.lang} dict={props.dict} current="integrations">
      {() => <Integrations {...props} />}
    </AdminArea>
  );
}

const stamp = (iso: string, lang: Locale) =>
  `${formatDate(iso.slice(0, 10), lang)} ${iso.slice(0, 4)}, ${iso.slice(11, 16)} UTC`;

function Integrations({ lang, dict, providers }: Props) {
  const t = dict.admin.integrations;
  const [now] = useState(() => new Date());
  const { systems, errors } = integrationLog(providers, now);
  const nameOf = (id: string) => {
    const system = systems.find((item) => item.id === id);
    return system?.name ?? (system ? t.kinds[system.kind] : id);
  };

  return (
    <>
      <div>
        <h2 className={styles.sectionTitle}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
        <p className={styles.note}>{t.demo}</p>
      </div>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className={styles.boxTitle}>{t.systems.title}</caption>
          <thead>
            <tr>
              <th scope="col">{t.systems.name}</th>
              <th scope="col">{t.systems.availability}</th>
              <th scope="col">{t.systems.status}</th>
              <th scope="col">{t.systems.checked}</th>
            </tr>
          </thead>
          <tbody>
            {systems.map((system) => (
              <tr key={system.id}>
                <th scope="row">
                  {system.name ?? t.kinds[system.kind]}
                  {system.name && <span className={styles.note}> · {t.kinds.provider}</span>}
                </th>
                <td>{system.availability}%</td>
                <td>
                  <span className={styles.badge} data-tone={TONES[system.status]}>
                    {t.statuses[system.status]}
                  </span>
                </td>
                <td>{stamp(system.checkedAt, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className={styles.boxTitle}>{t.errors.title}</h3>
      {errors.length === 0 ? (
        <p>{t.errors.empty}</p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <caption className="visually-hidden">{t.errors.title}</caption>
            <thead>
              <tr>
                <th scope="col">{t.errors.at}</th>
                <th scope="col">{t.errors.system}</th>
                <th scope="col">{t.errors.code}</th>
                <th scope="col">{t.errors.result}</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((error) => (
                <tr key={error.id}>
                  <td>{stamp(error.at, lang)}</td>
                  <td>{nameOf(error.systemId)}</td>
                  <td>{t.errors.codes[error.code]}</td>
                  <td>{error.retried ? t.errors.retried : t.errors.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
