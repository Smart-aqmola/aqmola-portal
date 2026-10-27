"use client";

import { useState } from "react";
import type { ProviderInfo } from "@/features/account/domain/availability";
import type { Sector } from "@/features/catalog/domain/types";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { PERIODS_SHOWN, periodsBack, totalsOf, type Charge } from "../domain/charge";
import { formatMoney } from "@/shared/lib/money";
import { BillingArea, ObjectSelect, useChosenObject, type BillingContext } from "./billing-area";
import { day, periodLabel, type BillingDict } from "./billing-texts";
import styles from "./billing-styles";

export type BillingPageProps = {
  lang: Locale;
  dict: BillingDict;
  territories: { id: string; name: string }[];
  providers: readonly ProviderInfo[];
  missing: Record<string, readonly Sector[]>;
  /** What the address asked for: an object. */
  preset?: { property?: string };
};

/** The part "Charges": by object, month and provider, or all at once (spec 9.1–9.3, 9.8). */
export function ChargesPage(props: BillingPageProps) {
  const { lang } = props;
  return (
    <BillingArea {...props} current="charges" here={`/${lang}/billing`}>
      {(context) => <View {...props} context={context} />}
    </BillingArea>
  );
}

type ViewMode = "summary" | "providers";

function View({ lang, dict, preset, context }: BillingPageProps & { context: BillingContext }) {
  const { properties, labelOf, chargesOf, period: current } = context;
  const t = dict.billing;
  const { property, setId } = useChosenObject(properties, preset?.property);
  const [period, setPeriod] = useState(current);
  const [mode, setMode] = useState<ViewMode>("summary");

  const all = chargesOf(property);
  const charges = all.filter((item) => item.period === period);
  const totals = totalsOf(charges);
  const stale = charges.filter((item) => !item.available);
  const empty = t.common.emptyValue;

  return (
    <>
      <div>
        <h2 className={styles.heading}>{t.nav.charges}</h2>
        <p className={styles.note}>{t.common.demoNote}</p>
      </div>
      <div className={styles.listTools}>
        {properties.length > 1 && (
          <ObjectSelect
            dict={dict}
            properties={properties}
            labelOf={labelOf}
            value={property.id}
            onChange={setId}
          />
        )}
        <Field label={t.common.period}>
          {(control) => (
            <select {...control} value={period} onChange={(event) => setPeriod(event.target.value)}>
              {periodsBack(current, PERIODS_SHOWN).map((item) => (
                <option key={item} value={item}>
                  {periodLabel(item, dict)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t.common.view}>
          {(control) => (
            <select
              {...control}
              value={mode}
              onChange={(event) => setMode(event.target.value as ViewMode)}
            >
              <option value="summary">{t.common.viewSummary}</option>
              <option value="providers">{t.common.viewProviders}</option>
            </select>
          )}
        </Field>
      </div>
      <p className={styles.note}>{labelOf(property)}</p>

      {charges.length === 0 ? (
        <section className={styles.card}>
          <h3 className={styles.heading}>{t.common.noServices.title}</h3>
          <p>{t.common.noServices.text}</p>
        </section>
      ) : (
        <>
          {stale.map((item) => (
            <section
              key={item.id}
              className={`${styles.box} ${styles.warn}`}
              aria-label={t.stale.title}
            >
              <h3 className={styles.boxTitle}>{t.stale.title}</h3>
              <p>
                {format(t.stale.text, {
                  provider: item.providerName,
                  date: day(item.updatedAt, lang, empty),
                })}
              </p>
            </section>
          ))}

          {mode === "summary" ? (
            <table className={styles.table}>
              <caption>
                {format(t.charges.summary.caption, { period: periodLabel(period, dict) })}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t.charges.summary.service}</th>
                  <th scope="col">{t.charges.summary.accrued}</th>
                  <th scope="col">{t.charges.summary.total}</th>
                </tr>
              </thead>
              <tbody>
                {charges.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">
                      {t.sectors[item.sector]}
                      <span className={styles.sub}>{item.providerName}</span>
                      {!item.available && (
                        <span className={styles.sub}>
                          {format(t.stale.short, { date: day(item.updatedAt, lang, empty) })}
                        </span>
                      )}
                    </th>
                    <td className={styles.money}>{formatMoney(item.accrued)}</td>
                    <td className={styles.money}>{formatMoney(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">{t.charges.summary.overall}</th>
                  <td className={styles.money}>{formatMoney(totals.accrued)}</td>
                  <td className={styles.money}>{formatMoney(totals.total)}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <ul className={styles.items}>
              {charges.map((item) => (
                <li key={item.id}>
                  <ChargeCard lang={lang} dict={dict} charge={item} />
                </li>
              ))}
            </ul>
          )}

          <div className={styles.actions}>
            {period === current && totals.total > 0 && (
              <Button href={`/${lang}/billing/pay?property=${property.id}`}>{t.charges.pay}</Button>
            )}
            <Button variant="light" href={`/${lang}/billing/receipt?property=${property.id}`}>
              {t.charges.receipt}
            </Button>
          </div>
          {totals.total === 0 && <p className={styles.note}>{t.charges.allPaid}</p>}
        </>
      )}
    </>
  );
}

function ChargeCard({ lang, dict, charge }: { lang: Locale; dict: BillingDict; charge: Charge }) {
  const t = dict.billing;
  const f = t.fields;
  const empty = t.common.emptyValue;
  const title = format(t.charges.cardTitle, {
    service: t.sectors[charge.sector],
    provider: charge.providerName,
  });
  const rows: [string, string][] = [
    [f.provider, charge.providerName],
    [f.service, t.sectors[charge.sector]],
    [f.account, charge.personalAccount],
    [f.period, periodLabel(charge.period, dict)],
    [f.previousDebt, formatMoney(charge.previousDebt)],
    [f.accrued, formatMoney(charge.accrued)],
    [f.recalculated, formatMoney(charge.recalculated)],
    [f.penalty, charge.penalty > 0 ? formatMoney(charge.penalty) : empty],
    [f.paid, formatMoney(charge.paid)],
    [f.overpayment, charge.overpayment > 0 ? formatMoney(charge.overpayment) : empty],
    [f.total, formatMoney(charge.total)],
    [f.generatedAt, day(charge.generatedAt, lang, empty)],
    [f.dueAt, charge.dueAt ? day(charge.dueAt, lang, empty) : t.charges.noDueDate],
    [f.updatedAt, day(charge.updatedAt, lang, empty)],
  ];
  return (
    <article className={styles.item} aria-label={title}>
      <div className={styles.detailHead}>
        <h3 className={styles.itemTitle}>{title}</h3>
        {!charge.available && (
          <span className={styles.badge} data-tone="problem">
            {t.stale.title}
          </span>
        )}
      </div>
      <dl className={styles.facts}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={styles.money}>{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
