"use client";

import { useState } from "react";
import { downloadText } from "@/shared/lib/download-text";
import { format } from "@/shared/i18n/format";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { PERIODS_SHOWN, periodsBack, totalsOf } from "../domain/charge";
import { formatMoney } from "@/shared/lib/money";
import { BillingArea, ObjectSelect, useChosenObject, type BillingContext } from "./billing-area";
import { day, periodLabel, receiptText } from "./billing-texts";
import type { BillingPageProps } from "./charges-page";
import styles from "./billing-styles";

/** The part "Single receipt": all services of an object for a month in one document (spec 9.4, 9.5, 9.9). */
export function ReceiptPage(props: BillingPageProps) {
  const { lang } = props;
  return (
    <BillingArea {...props} current="receipt" here={`/${lang}/billing/receipt`}>
      {(context) => <View {...props} context={context} />}
    </BillingArea>
  );
}

function View({ lang, dict, preset, context }: BillingPageProps & { context: BillingContext }) {
  const { properties, labelOf, chargesOf, period: current, payer } = context;
  const t = dict.billing;
  const r = t.receipt;
  const f = t.fields;
  const { property, setId } = useChosenObject(properties, preset?.property);
  const [period, setPeriod] = useState(current);

  const charges = chargesOf(property).filter((item) => item.period === period);
  const totals = totalsOf(charges);
  const address = labelOf(property);

  return (
    <>
      <div>
        <h2 className={styles.heading}>{r.title}</h2>
        <p className={styles.note}>{r.lead}</p>
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
      </div>

      {charges.length === 0 ? (
        <section className={styles.card}>
          <h3 className={styles.heading}>{t.common.noServices.title}</h3>
          <p>{t.common.noServices.text}</p>
        </section>
      ) : (
        <article className={styles.card} aria-labelledby="receipt-title">
          <h3 id="receipt-title" className={styles.itemTitle}>
            {r.title}: {periodLabel(period, dict)}
          </h3>
          <dl className={styles.facts}>
            <div>
              <dt>{r.payer}</dt>
              <dd>{payer}</dd>
            </div>
            <div>
              <dt>{r.address}</dt>
              <dd>{address}</dd>
            </div>
            <div>
              <dt>{r.period}</dt>
              <dd>{periodLabel(period, dict)}</dd>
            </div>
          </dl>

          <ul className={styles.lines}>
            {charges.map((item) => (
              <li key={item.id} className={styles.line}>
                <div>
                  <strong>{t.sectors[item.sector]}</strong>
                  <span className={styles.sub}>
                    {item.providerName} · {f.account}: {item.personalAccount}
                  </span>
                  {!item.available && (
                    <span className={styles.sub}>
                      {format(r.staleLine, { date: day(item.updatedAt, lang, "") })}
                    </span>
                  )}
                </div>
                <dl className={styles.facts}>
                  <div>
                    <dt>{r.columns.accrued}</dt>
                    <dd className={styles.money}>{formatMoney(item.accrued)}</dd>
                  </div>
                  <div>
                    <dt>{r.columns.debt}</dt>
                    <dd className={styles.money}>{formatMoney(item.previousDebt)}</dd>
                  </div>
                  <div>
                    <dt>{r.columns.adjustments}</dt>
                    <dd className={styles.money}>
                      {formatMoney(item.recalculated + item.penalty)}
                    </dd>
                  </div>
                  <div>
                    <dt>{r.columns.paid}</dt>
                    <dd className={styles.money}>{formatMoney(item.paid)}</dd>
                  </div>
                  <div>
                    <dt>{r.columns.total}</dt>
                    <dd className={styles.money}>{formatMoney(item.total)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          <p className={styles.bigTotal}>
            <span>{r.total}</span>
            <span className={styles.money}>{formatMoney(totals.total)}</span>
          </p>
          {totals.total === 0 && <p className={styles.note}>{r.paidAll}</p>}

          <div>
            <h4 className={styles.boxTitle}>{r.methods.title}</h4>
            <p className={styles.note}>{r.methods.text}</p>
          </div>

          <div className={styles.actions}>
            {period === current && totals.total > 0 && (
              <Button href={`/${lang}/billing/pay?property=${property.id}`}>{r.pay}</Button>
            )}
            <Button
              variant="light"
              onClick={() =>
                downloadText(
                  `receipt-${period}.txt`,
                  receiptText({ payer, address, period, charges }, dict, lang),
                )
              }
            >
              {r.download}
            </Button>
          </div>
          <p className={styles.note}>{r.downloadNote}</p>
        </article>
      )}
    </>
  );
}
