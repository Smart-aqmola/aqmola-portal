"use client";

import { useState } from "react";
import { CONTRACT_SECTORS, type ProviderInfo } from "@/features/account/domain/availability";
import { useProfiles } from "@/features/account/ui/use-profiles";
import { useAllProperties } from "@/features/account/ui/use-properties";
import { useAllAppeals } from "@/features/appeals/ui/use-appeals";
import { useApplications } from "@/features/applications/ui/use-applications";
import { formatMoney } from "@/features/billing/domain/money";
import { useAllPayments } from "@/features/billing/ui/use-payments";
import { useAllContracts } from "@/features/contracts/ui/use-contracts";
import { useAllMeterData } from "@/features/meters/ui/use-meter-data";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { downloadText } from "@/shared/lib/download-text";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { useToast } from "@/shared/ui/toast/toast-provider";
import { integrationLog } from "../domain/integrations";
import {
  buildReport,
  emptyFilter,
  reportRows,
  statusGroups,
  toCsv,
  type Indicator,
  type ReportFilter,
  type StatusGroup,
} from "../domain/reports";
import { AdminArea, type AdminContext, type AdminDict } from "./admin-area";
import styles from "./admin.module.css";

type Props = {
  lang: Locale;
  dict: AdminDict;
  providers: readonly ProviderInfo[];
  territories: { id: string; name: string }[];
};

/** Reports for a period with filters and export (spec 17.1–17.4). */
export function AdminReports(props: Props) {
  return (
    <AdminArea lang={props.lang} dict={props.dict} current="reports">
      {(context) => <Reports {...props} context={context} />}
    </AdminArea>
  );
}

function show(item: Indicator, dict: AdminDict): string {
  if (item.value === null) return dict.admin.reports.noData;
  if (item.unit === "percent") return `${item.value}%`;
  if (item.unit === "money") return formatMoney(item.value);
  return String(item.value);
}

function Reports({ dict, providers, territories, context }: Props & { context: AdminContext }) {
  const t = dict.admin.reports;
  const toast = useToast();
  const { profiles } = useProfiles();
  const properties = useAllProperties();
  const { applications } = useApplications();
  const { all: contracts } = useAllContracts();
  const { meters, readings, requests } = useAllMeterData();
  const payments = useAllPayments();
  const { all: appeals } = useAllAppeals();
  const [now] = useState(() => new Date());
  const [filter, setFilter] = useState<ReportFilter>(emptyFilter);
  const log = integrationLog(providers, now);

  const indicators = buildReport(
    {
      profiles,
      properties,
      providers,
      applications,
      contracts,
      meters,
      readings,
      requests,
      payments,
      appeals,
      systems: log.systems,
      errors: log.errors,
    },
    filter,
    now,
    context.config.regulationDays,
  );
  const finance = context.config.financeAccess;
  const set = (patch: Partial<ReportFilter>) => setFilter((current) => ({ ...current, ...patch }));

  function download() {
    const period =
      filter.from || filter.to
        ? [
            filter.from && format(t.export.from, { date: filter.from }),
            filter.to && format(t.export.to, { date: filter.to }),
          ]
            .filter(Boolean)
            .join(" ")
        : t.export.everything;
    const rows = [
      [t.title, ""],
      [t.export.period, period],
      ...reportRows(indicators, t.indicators, finance),
    ];
    // The BOM lets a spreadsheet read the file as UTF-8, so Cyrillic and Kazakh letters survive.
    downloadText(`${t.export.file}.csv`, `﻿${toCsv(rows)}`);
    toast.show(t.export.done);
  }

  return (
    <>
      <div>
        <h2 className={styles.sectionTitle}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>
      <div className={styles.listTools}>
        <Field label={t.filters.from}>
          {(control) => (
            <input
              {...control}
              type="date"
              value={filter.from}
              onChange={(event) => set({ from: event.target.value })}
            />
          )}
        </Field>
        <Field label={t.filters.to}>
          {(control) => (
            <input
              {...control}
              type="date"
              value={filter.to}
              onChange={(event) => set({ to: event.target.value })}
            />
          )}
        </Field>
        <Field label={t.filters.territory}>
          {(control) => (
            <select
              {...control}
              value={filter.territoryId}
              onChange={(event) => set({ territoryId: event.target.value })}
            >
              <option value="">{t.filters.all}</option>
              {territories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t.filters.organization}>
          {(control) => (
            <select
              {...control}
              value={filter.organizationId}
              onChange={(event) => set({ organizationId: event.target.value })}
            >
              <option value="">{t.filters.all}</option>
              {providers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t.filters.sector}>
          {(control) => (
            <select
              {...control}
              value={filter.sector}
              onChange={(event) => set({ sector: event.target.value as ReportFilter["sector"] })}
            >
              <option value="">{t.filters.all}</option>
              {CONTRACT_SECTORS.map((item) => (
                <option key={item} value={item}>
                  {dict.admin.organizations.sectors[item]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t.filters.status}>
          {(control) => (
            <select
              {...control}
              value={filter.status}
              onChange={(event) => set({ status: event.target.value as StatusGroup | "" })}
            >
              <option value="">{t.filters.all}</option>
              {statusGroups.map((item) => (
                <option key={item} value={item}>
                  {t.filters.statuses[item]}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <div>
        <Button variant="light" onClick={() => setFilter(emptyFilter)}>
          {t.filters.reset}
        </Button>
      </div>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className="visually-hidden">{t.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.indicator}</th>
              <th scope="col">{t.value}</th>
            </tr>
          </thead>
          <tbody>
            {indicators.map((item) => (
              <tr key={item.id}>
                <th scope="row">{t.indicators[item.id]}</th>
                <td>{item.financial && !finance ? t.locked : show(item, dict)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>{t.notes}</p>

      <section className={styles.actionsBox} aria-labelledby="export-title">
        <h3 id="export-title" className={styles.boxTitle}>
          {t.export.title}
        </h3>
        <div className={styles.actions}>
          <Button onClick={download}>{t.export.csv}</Button>
          <Button variant="light" onClick={() => toast.show(t.export.notBuilt)}>
            {t.export.xlsx}
          </Button>
          <Button variant="light" onClick={() => toast.show(t.export.notBuilt)}>
            {t.export.pdf}
          </Button>
        </div>
        <p className={styles.note}>{t.export.demo}</p>
      </section>
    </>
  );
}
