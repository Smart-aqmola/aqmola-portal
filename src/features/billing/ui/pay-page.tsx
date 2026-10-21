"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "@/shared/i18n/format";
import { Button } from "@/shared/ui/button/button";
import { CheckField, Field } from "@/shared/ui/field/field";
import { totalsOf, type Charge } from "../domain/charge";
import { formatMoney } from "../domain/money";
import {
  checkSelection,
  createPayment,
  isOpen,
  paymentMethods,
  type PaymentMethod,
} from "../domain/payment";
import { BillingArea, ObjectSelect, useChosenObject, type BillingContext } from "./billing-area";
import { periodLabel } from "./billing-texts";
import type { BillingPageProps } from "./charges-page";
import styles from "./billing.module.css";

/** The part "Payment": choose services and a way to pay, then go to the payment service (spec 9.10–9.14). */
export function PayPage(props: BillingPageProps) {
  const { lang } = props;
  return (
    <BillingArea {...props} current="pay" here={`/${lang}/billing/pay`}>
      {(context) => <View {...props} context={context} />}
    </BillingArea>
  );
}

type Blocked = "stale" | "paid" | "pending";

function View({ lang, dict, preset, context }: BillingPageProps & { context: BillingContext }) {
  const { ownerId, properties, labelOf, chargesOf, period, payments, now } = context;
  const router = useRouter();
  const t = dict.billing;
  const p = t.pay;
  const { property, setId } = useChosenObject(properties, preset?.property);
  // `null` means "everything that can be paid", until the person changes the choice.
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("gateway");
  const [error, setError] = useState<string>();

  const charges = chargesOf(property).filter((item) => item.period === period);
  const open = new Set(
    payments.mine
      .filter((item) => isOpen(item.status))
      .flatMap((item) => item.lines.map((line) => line.chargeId)),
  );
  const blockedBy = (charge: Charge): Blocked | null =>
    !charge.available
      ? "stale"
      : charge.total === 0
        ? "paid"
        : open.has(charge.id)
          ? "pending"
          : null;
  const payable = charges.filter((item) => blockedBy(item) === null);
  const selectedIds = chosen ?? payable.map((item) => item.id);
  const selected = payable.filter((item) => selectedIds.includes(item.id));
  const total = totalsOf(selected).total;

  function toggle(id: string, on: boolean) {
    setError(undefined);
    setChosen(on ? [...selectedIds, id] : selectedIds.filter((item) => item !== id));
  }

  function go() {
    const problem = checkSelection(selected, payments.mine);
    if (problem) {
      setError(p.errors[problem]);
      return;
    }
    const payment = createPayment(
      selected,
      method,
      { id: crypto.randomUUID(), ownerId, address: labelOf(property) },
      payments.everyone(),
      now,
    );
    payments.add(payment);
    router.push(`/${lang}/billing/payments/${payment.id}`);
  }

  return (
    <>
      <div>
        <h2 className={styles.heading}>{p.title}</h2>
        <p className={styles.note}>{p.lead}</p>
      </div>
      {properties.length > 1 && (
        <ObjectSelect
          dict={dict}
          properties={properties}
          labelOf={labelOf}
          value={property.id}
          onChange={(id) => {
            setId(id);
            setChosen(null);
            setError(undefined);
          }}
        />
      )}
      <p className={styles.note}>
        {labelOf(property)}. {format(p.period, { period: periodLabel(period, dict) })}
      </p>

      {charges.length === 0 ||
      (payable.length === 0 && charges.every((item) => blockedBy(item) === "paid")) ? (
        <section className={styles.card}>
          <h3 className={styles.heading}>{p.nothing.title}</h3>
          <p>{p.nothing.text}</p>
          <div>
            <Button variant="light" href={`/${lang}/billing/payments`}>
              {t.nav.payments}
            </Button>
          </div>
        </section>
      ) : (
        <section className={styles.card} aria-labelledby="pay-select">
          <div className={styles.pickRow}>
            <h3 id="pay-select" className={styles.boxTitle}>
              {p.select}
            </h3>
            <div className={styles.actions}>
              <Button variant="light" onClick={() => setChosen(payable.map((item) => item.id))}>
                {p.all}
              </Button>
              <Button variant="ghost" onClick={() => setChosen([])}>
                {p.clear}
              </Button>
            </div>
          </div>

          <div className={styles.form}>
            {charges.map((item) => {
              const why = blockedBy(item);
              const name = format(p.line, {
                service: t.sectors[item.sector],
                provider: item.providerName,
              });
              return why ? (
                <p key={item.id} className={styles.pickRow}>
                  <span>
                    {name}
                    <span className={styles.sub}>{p.blocked[why]}</span>
                  </span>
                  <span className={styles.money}>{formatMoney(item.total)}</span>
                </p>
              ) : (
                <CheckField
                  key={item.id}
                  label={
                    <span className={styles.pickRow}>
                      <span>{name}</span>
                      <strong className={styles.money}>{formatMoney(item.total)}</strong>
                    </span>
                  }
                  checked={selectedIds.includes(item.id)}
                  onChange={(on) => toggle(item.id, on)}
                />
              );
            })}

            <Field label={p.method}>
              {(control) => (
                <select
                  {...control}
                  value={method}
                  onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                >
                  {paymentMethods.map((item) => (
                    <option key={item} value={item}>
                      {p.methods[item]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          <p className={styles.bigTotal}>
            <span>{p.total}</span>
            <span className={styles.money}>{formatMoney(total)}</span>
          </p>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div>
            <Button onClick={go}>{p.go}</Button>
          </div>
        </section>
      )}
    </>
  );
}
