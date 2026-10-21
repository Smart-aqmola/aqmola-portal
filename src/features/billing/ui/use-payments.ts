"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createLocalStore } from "@/shared/lib/local-store";
import { MAX_PAYMENTS, type Payment } from "../domain/payment";
import { PAYMENTS_KEY, parsePayments } from "../domain/storage";

const NONE: Payment[] = [];
const store = createLocalStore<Payment[]>({
  key: PAYMENTS_KEY,
  parse: parsePayments,
  empty: NONE,
});

/** The payments of one person. With a server this becomes calls to the backend. */
export function usePayments(ownerId: string | null) {
  const all = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const mine = useMemo(
    () => (ownerId ? all.filter((item) => item.ownerId === ownerId) : NONE),
    [all, ownerId],
  );

  const add = useCallback((payment: Payment) => {
    store.write([payment, ...store.getSnapshot()].slice(0, MAX_PAYMENTS));
  }, []);

  const replace = useCallback((changed: Payment) => {
    store.write(store.getSnapshot().map((item) => (item.id === changed.id ? changed : item)));
  }, []);

  /** Every payment in this browser, so a new number never repeats. */
  const everyone = useCallback(() => store.getSnapshot(), []);

  return { mine, add, replace, everyone };
}
