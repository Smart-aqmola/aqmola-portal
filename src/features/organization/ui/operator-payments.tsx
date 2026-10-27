"use client";

import type { ProviderInfo } from "@/features/account/domain/availability";
import { PaymentBadge } from "@/features/billing/ui/payment-badge";
import { useAllPayments } from "@/features/billing/ui/use-payments";
import { formatMoney } from "@/shared/lib/money";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import { paymentsOf } from "../domain/scope";
import { OperatorArea, type OperatorContext, type OperatorDict } from "./operator-area";
import styles from "./organization-styles";

type Props = { lang: Locale; dict: OperatorDict; providers: readonly ProviderInfo[] };

/** Payments of residents for the services of the organization, only its own share of each (spec 12.2). */
export function OperatorPayments(props: Props) {
  return (
    <OperatorArea {...props} current="payments">
      {(context) => <Register {...props} context={context} />}
    </OperatorArea>
  );
}

function Register({ lang, dict, context }: Props & { context: OperatorContext }) {
  const t = dict.cabinet.payments;
  const all = useAllPayments();
  const mine = paymentsOf(context.org, all).sort((a, b) =>
    b.payment.createdAt.localeCompare(a.payment.createdAt),
  );
  const received = mine
    .filter((item) => item.payment.status === "paid")
    .reduce((sum, item) => sum + item.lines.reduce((total, line) => total + line.amount, 0), 0);

  return (
    <>
      <div>
        <h2 className={styles.sectionTitle}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>
      {mine.length === 0 ? (
        <p>{dict.cabinet.common.noItems}</p>
      ) : (
        <>
          <p>{format(t.totalPaid, { amount: formatMoney(received) })}</p>
          <ul className={styles.items}>
            {mine.map(({ payment, lines }) => (
              <li key={payment.id}>
                <article className={styles.item} aria-label={payment.number}>
                  <div className={styles.detailHead}>
                    <h3 className={styles.itemTitle}>{payment.number}</h3>
                    <PaymentBadge
                      status={payment.status}
                      label={dict.billing.status[payment.status]}
                    />
                  </div>
                  <dl className={styles.facts}>
                    <div>
                      <dt>{t.fields.created}</dt>
                      <dd>
                        {formatDate(payment.createdAt.slice(0, 10), lang)}{" "}
                        {payment.createdAt.slice(0, 4)}
                      </dd>
                    </div>
                    <div>
                      <dt>{t.fields.address}</dt>
                      <dd>{payment.address}</dd>
                    </div>
                    {lines.map((line) => (
                      <div key={line.chargeId}>
                        <dt>
                          {t.fields.amount}, {t.fields.account.toLowerCase()} {line.personalAccount}
                        </dt>
                        <dd>{formatMoney(line.amount)}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
