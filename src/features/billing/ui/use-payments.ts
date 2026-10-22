"use client";

import { createCollection } from "@/shared/lib/collection";
import { MAX_PAYMENTS, type Payment } from "../domain/payment";
import { PAYMENTS_KEY, parsePayments } from "../domain/storage";

const payments = createCollection<Payment>({
  key: PAYMENTS_KEY,
  parse: parsePayments,
  max: MAX_PAYMENTS,
});

/** The payments of one person. `everyone` is every payment, so a new number never repeats. */
export function usePayments(ownerId: string | null) {
  const mine = payments.useMine(ownerId);
  return { mine, add: payments.add, replace: payments.replace, everyone: payments.snapshot };
}

/** Every payment in this browser, for the cabinet of an organization (spec 12.2). */
export function useAllPayments() {
  return payments.useAll();
}
