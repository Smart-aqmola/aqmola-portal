"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProviderInfo } from "@/features/account/domain/availability";
import type { Sector } from "@/features/catalog/domain/types";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { downloadText } from "@/shared/lib/download-text";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { useToast } from "@/shared/ui/toast/toast-provider";
import { formatMoney } from "../domain/money";
import {
  applicantAction,
  gatewayNotice,
  gatewayOptions,
  type Payment,
  type PaymentStatus,
} from "../domain/payment";
import { BillingArea, type BillingContext } from "./billing-area";
import {
  confirmationText,
  paymentLink,
  periodLabel,
  stamp,
  type BillingDict,
} from "./billing-texts";
import { PaymentBadge } from "./payment-badge";
import styles from "./billing-styles";

type PaymentDetailProps = {
  lang: Locale;
  dict: BillingDict;
  territories: { id: string; name: string }[];
  providers: readonly ProviderInfo[];
  missing: Record<string, readonly Sector[]>;
  id: string;
};

/** The page of one payment: what is paid and how it splits, its status, the confirmation (spec 9.15–9.18). */
export function PaymentDetail(props: PaymentDetailProps) {
  const { lang, id } = props;
  return (
    <BillingArea {...props} current="payments" here={`/${lang}/billing/payments/${id}`}>
      {(context) => <Loaded {...props} context={context} />}
    </BillingArea>
  );
}

function Loaded({ lang, dict, id, context }: PaymentDetailProps & { context: BillingContext }) {
  const t = dict.billing.paymentDetail;
  const payment = context.payments.mine.find((item) => item.id === id);
  if (!payment) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{t.notFound.title}</h2>
        <p>{t.notFound.text}</p>
        <div>
          <Button href={`/${lang}/billing/payments`}>{t.notFound.button}</Button>
        </div>
      </section>
    );
  }
  return <Detail lang={lang} dict={dict} payment={payment} context={context} />;
}

function Detail({
  lang,
  dict,
  payment,
  context,
}: {
  lang: Locale;
  dict: BillingDict;
  payment: Payment;
  context: BillingContext;
}) {
  const t = dict.billing.paymentDetail;
  const f = t.fields;
  const { payments, now } = context;
  const toast = useToast();

  function act(action: "start" | "cancel") {
    const result = applicantAction(payment, action, new Date());
    if (result.ok) payments.replace(result.payment);
  }

  return (
    <>
      <Link href={`/${lang}/billing/payments`} className={styles.back}>
        {t.back}
      </Link>
      <section className={styles.card} aria-labelledby="payment-head">
        <div className={styles.detailHead}>
          <h2 id="payment-head" className={styles.heading}>
            {payment.number}
          </h2>
          <PaymentBadge status={payment.status} label={dict.billing.status[payment.status]} />
        </div>
        <p>{dict.billing.statusHint[payment.status]}</p>

        <h3 className={styles.boxTitle}>{t.sections.data}</h3>
        <dl className={styles.facts}>
          <div>
            <dt>{f.object}</dt>
            <dd>{payment.address}</dd>
          </div>
          <div>
            <dt>{f.period}</dt>
            <dd>{periodLabel(payment.period, dict)}</dd>
          </div>
          <div>
            <dt>{f.method}</dt>
            <dd>{dict.billing.pay.methods[payment.method]}</dd>
          </div>
          <div>
            <dt>{f.total}</dt>
            <dd className={styles.money}>{formatMoney(payment.total)}</dd>
          </div>
          <div>
            <dt>{f.created}</dt>
            <dd>{stamp(payment.createdAt, lang)}</dd>
          </div>
        </dl>

        <table className={styles.table}>
          <caption>{t.split.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.split.service}</th>
              <th scope="col">{t.split.amount}</th>
            </tr>
          </thead>
          <tbody>
            {payment.lines.map((line) => (
              <tr key={line.chargeId}>
                <th scope="row">
                  {dict.billing.sectors[line.sector]}
                  <span className={styles.sub}>
                    {line.providerName} · {t.split.account}: {line.personalAccount}
                  </span>
                </th>
                <td className={styles.money}>{formatMoney(line.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">{t.split.total}</th>
              <td className={styles.money}>{formatMoney(payment.total)}</td>
            </tr>
          </tfoot>
        </table>

        {(payment.status === "awaiting_payment" || payment.status === "initiated") && (
          <div className={styles.box}>
            <h3 className={styles.boxTitle}>{t.sections.reference}</h3>
            <p>{t.reference[payment.method]}</p>
            {payment.method !== "gateway" && (
              <>
                <p>{format(t.reference.id, { reference: payment.reference })}</p>
                <p className={styles.sub}>
                  {format(t.reference.link, { link: paymentLink(payment.reference) })}
                </p>
              </>
            )}
          </div>
        )}

        <div className={styles.actions}>
          {payment.status === "awaiting_payment" && (
            <Button onClick={() => act("start")}>{t.actions.start}</Button>
          )}
          {(payment.status === "awaiting_payment" || payment.status === "initiated") && (
            <Button variant="light" onClick={() => act("cancel")}>
              {t.actions.cancel}
            </Button>
          )}
          {(payment.status === "paid" || payment.status === "refunded") && (
            <Button
              variant="light"
              onClick={() =>
                downloadText(`${payment.number}.txt`, confirmationText(payment, dict, lang))
              }
            >
              {t.download}
            </Button>
          )}
        </div>

        <h3 className={styles.boxTitle}>{t.sections.history}</h3>
        <ul className={styles.timeline}>
          {payment.history.map((entry, index) => (
            <li key={`${entry.status}-${index}`}>
              <span>{stamp(entry.at, lang)}</span>
              <PaymentBadge status={entry.status} label={dict.billing.status[entry.status]} />
            </li>
          ))}
        </ul>
      </section>

      <GatewayPanel
        dict={dict}
        payment={payment}
        onChange={(changed, message) => {
          payments.replace(changed);
          toast.show(message);
        }}
        now={now}
      />
    </>
  );
}

/** Plays the payment service: it reports results and may repeat a notice (spec 9.15, 9.17). */
function GatewayPanel({
  dict,
  payment,
  onChange,
  now,
}: {
  dict: BillingDict;
  payment: Payment;
  onChange: (payment: Payment, message: string) => void;
  now: Date;
}) {
  const t = dict.billing.paymentDetail.gateway;
  const options = gatewayOptions(payment.status);
  const [action, setAction] = useState<PaymentStatus | "">("");
  const [repeated, setRepeated] = useState(false);
  const last = payment.notices[payment.notices.length - 1];

  function apply() {
    if (!action) return;
    const result = gatewayNotice(payment, action, crypto.randomUUID(), new Date());
    if (!result.ok) return;
    setRepeated(false);
    setAction("");
    onChange(result.payment, t.applied);
  }

  function repeat() {
    if (!last) return;
    // The same notice again: the payment must not change a second time.
    const result = gatewayNotice(payment, payment.status, last, now);
    setRepeated(result.ok && result.duplicate);
  }

  return (
    <section className={styles.demo} aria-labelledby="gateway-panel">
      <strong id="gateway-panel">{t.title}</strong>
      <p>{t.hint}</p>
      {options.length > 0 ? (
        <>
          <Field label={t.action}>
            {(control) => (
              <select
                {...control}
                value={action}
                onChange={(event) => setAction(event.target.value as PaymentStatus | "")}
              >
                <option value="">{t.choose}</option>
                {options.map((item) => (
                  <option key={item} value={item}>
                    {t.actions[item as keyof typeof t.actions]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div>
            <Button variant="light" onClick={apply}>
              {t.apply}
            </Button>
          </div>
        </>
      ) : (
        <p>{t.final}</p>
      )}
      <div>
        <Button variant="light" onClick={repeat} disabled={!last}>
          {t.repeat}
        </Button>
      </div>
      {!last && <p className={styles.note}>{t.noNotice}</p>}
      {repeated && <p>{t.repeated}</p>}
    </section>
  );
}
