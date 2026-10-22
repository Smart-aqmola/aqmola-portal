"use client";

import { ShowMoreList } from "@/shared/ui/show-more/show-more";
import Link from "next/link";
import { useState } from "react";
import { format } from "@/shared/i18n/format";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { formatMoney } from "../domain/money";
import { paymentStatuses, type PaymentStatus } from "../domain/payment";
import { BillingArea, type BillingContext } from "./billing-area";
import { day, periodLabel } from "./billing-texts";
import type { BillingPageProps } from "./charges-page";
import { PaymentBadge } from "./payment-badge";
import styles from "./billing.module.css";

/** The part "History of payments" (spec 9.18). */
export function PaymentsList(props: BillingPageProps) {
  const { lang } = props;
  return (
    <BillingArea {...props} current="payments" here={`/${lang}/billing/payments`}>
      {(context) => <List {...props} context={context} />}
    </BillingArea>
  );
}

function List({ lang, dict, context }: BillingPageProps & { context: BillingContext }) {
  const t = dict.billing.payments;
  const f = t.fields;
  const { payments } = context;
  const [filter, setFilter] = useState<PaymentStatus | "">("");

  if (payments.mine.length === 0) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{t.empty.title}</h2>
        <p>{t.empty.text}</p>
        <div>
          <Button href={`/${lang}/billing/pay`}>{t.empty.button}</Button>
        </div>
      </section>
    );
  }

  const shown = [...payments.mine]
    .filter((item) => !filter || item.status === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <div>
        <h2 className={styles.heading}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>
      <div className={styles.listTools}>
        <Field label={t.filter}>
          {(control) => (
            <select
              {...control}
              value={filter}
              onChange={(event) => setFilter(event.target.value as PaymentStatus | "")}
            >
              <option value="">{t.all}</option>
              {paymentStatuses
                .filter((status) => payments.mine.some((item) => item.status === status))
                .map((status) => (
                  <option key={status} value={status}>
                    {dict.billing.status[status]}
                  </option>
                ))}
            </select>
          )}
        </Field>
      </div>
      <p className={styles.note} aria-live="polite">
        {format(t.count, { n: shown.length })}
      </p>
      <ShowMoreList items={shown} labels={dict.list}>
        {(visible) => (
          <ul className={styles.items}>
            {visible.map((item) => (
              <li key={item.id}>
                <article className={styles.item} aria-label={item.number}>
                  <div className={styles.detailHead}>
                    <h3 className={styles.itemTitle}>{item.number}</h3>
                    <PaymentBadge status={item.status} label={dict.billing.status[item.status]} />
                  </div>
                  <dl className={styles.facts}>
                    <div>
                      <dt>{f.created}</dt>
                      <dd>{day(item.createdAt, lang, "")}</dd>
                    </div>
                    <div>
                      <dt>{f.object}</dt>
                      <dd>{item.address}</dd>
                    </div>
                    <div>
                      <dt>{f.period}</dt>
                      <dd>{periodLabel(item.period, dict)}</dd>
                    </div>
                    <div>
                      <dt>{f.method}</dt>
                      <dd>{dict.billing.pay.methods[item.method]}</dd>
                    </div>
                    <div>
                      <dt>{f.total}</dt>
                      <dd className={styles.money}>{formatMoney(item.total)}</dd>
                    </div>
                  </dl>
                  <div>
                    <Link href={`/${lang}/billing/payments/${item.id}`} className={styles.open}>
                      {t.open}
                      <span className="visually-hidden"> — {item.number}</span>
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </ShowMoreList>
    </>
  );
}
