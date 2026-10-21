import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import type { Charge } from "../domain/charge";
import { totalsOf } from "../domain/charge";
import { formatMoney } from "../domain/money";
import type { Payment } from "../domain/payment";

export type BillingDict = Pick<Dictionary, "billing" | "properties" | "account">;

/** "Октябрь 2026" from "2026-10". The month names come from the dictionary. */
export function periodLabel(period: string, dict: BillingDict): string {
  const [year, month] = period.split("-").map(Number);
  return `${dict.billing.months[month - 1]} ${year}`;
}

/** "21 октября 2026" from a date or a date with time; the day never shifts with the time zone. */
export function day(iso: string | undefined, lang: Locale, empty: string): string {
  return iso ? `${formatDate(iso.slice(0, 10), lang)} ${iso.slice(0, 4)}` : empty;
}

/** "21 октября 2026, 06:00 UTC". */
export function stamp(iso: string, lang: Locale): string {
  return `${day(iso, lang, "")}, ${iso.slice(11, 16)} UTC`;
}

/** The link a person could pay by. It is a demo and leads nowhere. */
export function paymentLink(reference: string): string {
  return `https://pay.example.test/${reference.toLowerCase()}`;
}

const line = (label: string, value: string) => `${label}: ${value}`;

/** The single receipt as a text file to keep (spec 9.9). In the real portal this is a PDF. */
export function receiptText(
  input: {
    payer: string;
    address: string;
    period: string;
    charges: readonly Charge[];
  },
  dict: BillingDict,
  lang: Locale,
): string {
  const t = dict.billing;
  const f = t.fields;
  const lines = [
    t.receipt.fileTitle,
    t.receipt.fileDemo,
    "",
    line(t.receipt.payer, input.payer),
    line(t.receipt.address, input.address),
    line(t.receipt.period, periodLabel(input.period, dict)),
    "",
  ];
  for (const charge of input.charges) {
    lines.push(
      `${t.sectors[charge.sector]}, ${charge.providerName}`,
      `  ${line(f.account, charge.personalAccount)}`,
      `  ${line(f.previousDebt, formatMoney(charge.previousDebt))}`,
      `  ${line(f.accrued, formatMoney(charge.accrued))}`,
      `  ${line(f.recalculated, formatMoney(charge.recalculated))}`,
      `  ${line(f.penalty, formatMoney(charge.penalty))}`,
      `  ${line(f.paid, formatMoney(charge.paid))}`,
      `  ${line(f.total, formatMoney(charge.total))}`,
    );
    if (!charge.available) {
      lines.push(`  ${format(t.receipt.staleLine, { date: day(charge.updatedAt, lang, "") })}`);
    }
    lines.push("");
  }
  lines.push(line(t.receipt.total, formatMoney(totalsOf(input.charges).total)));
  return lines.join("\n") + "\n";
}

/** The confirmation of a payment as a text file (spec 9.18). */
export function confirmationText(payment: Payment, dict: BillingDict, lang: Locale): string {
  const t = dict.billing;
  const d = t.paymentDetail;
  const lines = [
    d.file.title,
    d.file.demo,
    "",
    line(d.fields.number, payment.number),
    line(d.fields.object, payment.address),
    line(d.fields.period, periodLabel(payment.period, dict)),
    line(d.fields.method, t.pay.methods[payment.method]),
    line(t.payments.fields.status, t.status[payment.status]),
    line(d.fields.created, stamp(payment.createdAt, lang)),
    "",
    d.split.caption,
  ];
  for (const item of payment.lines) {
    lines.push(
      `  ${t.sectors[item.sector]}, ${item.providerName}, ${item.personalAccount}: ${formatMoney(item.amount)}`,
    );
  }
  lines.push("", line(d.split.total, formatMoney(payment.total)));
  return lines.join("\n") + "\n";
}
