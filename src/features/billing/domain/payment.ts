import type { ContractSector } from "@/features/account/domain/availability";
import { isPayable, type Charge } from "./charge";
import { nextYearNumber } from "@/shared/lib/numbering";

/** Statuses of a payment, in the words of the specification (9.16). */
export const paymentStatuses = [
  "awaiting_payment",
  "initiated",
  "processing",
  "paid",
  "declined",
  "cancelled",
  "refunded",
  "awaiting_confirmation",
] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

/** Ways to pay (spec 9.11); in the demo all three end in the same demo gateway. */
export const paymentMethods = ["gateway", "bank_app", "reference"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

/** One service inside a payment. The provider and the account are kept apart, for the split (9.12, 9.13). */
export type PaymentLine = {
  chargeId: string;
  providerId: string;
  providerName: string;
  sector: ContractSector;
  personalAccount: string;
  amount: number;
};

export type PaymentActor = "applicant" | "gateway";
export type PaymentHistoryEntry = {
  status: PaymentStatus;
  at: string;
  actor: PaymentActor;
  note?: string;
};

/**
 * A payment as the portal knows it. Card data is never here: it is entered at the payment
 * service, and the portal only learns the result (spec 9.15, 9.19).
 */
export type Payment = {
  id: string;
  ownerId: string;
  propertyId: string;
  /** The address as written when the payment was made, so it stays readable later. */
  address: string;
  period: string;
  number: string;
  method: PaymentMethod;
  /** The identifier to pay by (spec 9.11, last item). */
  reference: string;
  lines: PaymentLine[];
  total: number;
  status: PaymentStatus;
  history: PaymentHistoryEntry[];
  /** Ids of the notices of the payment service already taken in, so a repeat is ignored (spec 9.17). */
  notices: string[];
  createdAt: string;
  updatedAt: string;
};

export const NUMBER_PATTERN = /^DEMO-PAY-\d{4}-\d{5}$/;
export const MAX_PAYMENTS = 100;
export const MAX_NOTICES = 20;

/** Payments that are still on their way: a service in one of them must not be paid twice. */
const OPEN: readonly PaymentStatus[] = [
  "awaiting_payment",
  "initiated",
  "processing",
  "awaiting_confirmation",
];

export const isOpen = (status: PaymentStatus): boolean => OPEN.includes(status);
export const isFinalPayment = (status: PaymentStatus): boolean =>
  status === "declined" || status === "cancelled" || status === "refunded";

/** Next free number of the year: DEMO-PAY-2026-00001, ... */
export function nextPaymentNumber(existing: readonly { number: string }[], now: Date): string {
  return nextYearNumber(
    "DEMO-PAY",
    existing.map((item) => item.number),
    now,
  );
}

/** "PAY-1A2B3C4D": the identifier to pay by, made from the id of the payment. */
export function paymentReference(id: string): string {
  return `PAY-${id
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 8)
    .toUpperCase()}`;
}

export type SelectionProblem = "empty" | "unavailable" | "nothing_due" | "pending";

/** Why this choice of services cannot be paid, or null. Each service is paid once at a time. */
export function checkSelection(
  charges: readonly Charge[],
  payments: readonly Payment[],
): SelectionProblem | null {
  if (charges.length === 0) return "empty";
  if (charges.some((charge) => !charge.available)) return "unavailable";
  if (charges.some((charge) => !isPayable(charge))) return "nothing_due";
  const busy = new Set(
    payments
      .filter((item) => isOpen(item.status))
      .flatMap((item) => item.lines.map((l) => l.chargeId)),
  );
  if (charges.some((charge) => busy.has(charge.id))) return "pending";
  return null;
}

/** Starts a payment for the chosen services, each in full (spec 9.11). Nothing is taken yet. */
export function createPayment(
  charges: readonly Charge[],
  method: PaymentMethod,
  context: { id: string; ownerId: string; address: string },
  existing: readonly { number: string }[],
  now: Date,
): Payment {
  const first = charges[0];
  if (!first) throw new Error("A payment needs at least one service");
  const at = now.toISOString();
  const lines = charges.map<PaymentLine>((charge) => ({
    chargeId: charge.id,
    providerId: charge.providerId,
    providerName: charge.providerName,
    sector: charge.sector,
    personalAccount: charge.personalAccount,
    amount: charge.total,
  }));
  return {
    id: context.id,
    ownerId: context.ownerId,
    propertyId: first.propertyId,
    address: context.address,
    period: first.period,
    number: nextPaymentNumber(existing, now),
    method,
    reference: paymentReference(context.id),
    lines,
    total: lines.reduce((sum, line) => sum + line.amount, 0),
    status: "awaiting_payment",
    history: [{ status: "awaiting_payment", at, actor: "applicant" }],
    notices: [],
    createdAt: at,
    updatedAt: at,
  };
}

export type PaymentChange = { ok: true; payment: Payment } | { ok: false; reason: "not_allowed" };

function moved(payment: Payment, to: PaymentStatus, actor: PaymentActor, now: Date): Payment {
  const at = now.toISOString();
  return {
    ...payment,
    status: to,
    updatedAt: at,
    history: [...payment.history, { status: to, at, actor }],
  };
}

/** The person goes to pay, or gives up (spec 9.16: "initiated", "cancelled"). */
export function applicantAction(
  payment: Payment,
  action: "start" | "cancel",
  now: Date,
): PaymentChange {
  if (action === "start" && payment.status === "awaiting_payment") {
    return { ok: true, payment: moved(payment, "initiated", "applicant", now) };
  }
  if (
    action === "cancel" &&
    (payment.status === "awaiting_payment" || payment.status === "initiated")
  ) {
    return { ok: true, payment: moved(payment, "cancelled", "applicant", now) };
  }
  return { ok: false, reason: "not_allowed" };
}

const GATEWAY_MOVES: Partial<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  awaiting_payment: ["processing"],
  initiated: ["processing"],
  processing: ["paid", "declined", "awaiting_confirmation"],
  awaiting_confirmation: ["paid", "declined"],
  paid: ["refunded"],
};

/** What the payment service may report in this status (demo; the real one calls the backend). */
export function gatewayOptions(status: PaymentStatus): readonly PaymentStatus[] {
  return GATEWAY_MOVES[status] ?? [];
}

export type NoticeResult =
  { ok: true; payment: Payment; duplicate: boolean } | { ok: false; reason: "not_allowed" };

/**
 * The payment service reports a result (spec 9.15). Every notice has an id: the same notice sent
 * again changes nothing, so a payment is never credited twice (spec 9.17).
 */
export function gatewayNotice(
  payment: Payment,
  to: PaymentStatus,
  noticeId: string,
  now: Date,
): NoticeResult {
  if (payment.notices.includes(noticeId)) return { ok: true, payment, duplicate: true };
  if (!gatewayOptions(payment.status).includes(to)) return { ok: false, reason: "not_allowed" };
  const next = moved(payment, to, "gateway", now);
  return {
    ok: true,
    duplicate: false,
    payment: { ...next, notices: [...payment.notices, noticeId].slice(-MAX_NOTICES) },
  };
}

/**
 * The charges with the paid payments taken in: what the provider would show after it got the
 * money. Only a paid payment counts, a refunded one does not (spec 9.15, 9.18).
 */
export function applyPayments(charges: readonly Charge[], payments: readonly Payment[]): Charge[] {
  const credited = new Map<string, number>();
  for (const payment of payments) {
    if (payment.status !== "paid") continue;
    for (const line of payment.lines) {
      credited.set(line.chargeId, (credited.get(line.chargeId) ?? 0) + line.amount);
    }
  }
  return charges.map((charge) => {
    const amount = credited.get(charge.id);
    if (!amount) return charge;
    return {
      ...charge,
      paid: charge.paid + amount,
      total: Math.max(charge.total - amount, 0),
      overpayment: charge.overpayment + Math.max(amount - charge.total, 0),
    };
  });
}
