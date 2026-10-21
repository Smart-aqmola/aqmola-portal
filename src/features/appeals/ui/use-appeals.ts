"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createLocalStore } from "@/shared/lib/local-store";
import { MAX_APPEALS, type Appeal } from "../domain/appeal";
import { APPEALS_KEY, parseAppeals } from "../domain/storage";

const NONE: Appeal[] = [];
const store = createLocalStore<Appeal[]>({ key: APPEALS_KEY, parse: parseAppeals, empty: NONE });

/** The appeals of one person. With a server this becomes calls to the backend. */
export function useAppeals(ownerId: string | null) {
  const all = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const mine = useMemo(
    () => (ownerId ? all.filter((item) => item.ownerId === ownerId) : NONE),
    [all, ownerId],
  );

  const add = useCallback((appeal: Appeal) => {
    store.write([appeal, ...store.getSnapshot()].slice(0, MAX_APPEALS));
  }, []);

  const replace = useCallback((changed: Appeal) => {
    store.write(store.getSnapshot().map((item) => (item.id === changed.id ? changed : item)));
  }, []);

  /** Every appeal in this browser, so a new number never repeats. */
  const everyone = useCallback(() => store.getSnapshot(), []);

  return { mine, add, replace, everyone };
}

/** Every appeal in this browser, for the cabinet of an organization (spec 12.2). */
export function useAllAppeals() {
  const all = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const replace = useCallback((changed: Appeal) => {
    store.write(store.getSnapshot().map((item) => (item.id === changed.id ? changed : item)));
  }, []);
  return { all, replace };
}
