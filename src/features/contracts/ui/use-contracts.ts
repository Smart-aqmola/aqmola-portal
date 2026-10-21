"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createLocalStore } from "@/shared/lib/local-store";
import { MAX_CONTRACTS, nextContractNumber, type ContractApplication } from "../domain/contract";
import { CONTRACTS_KEY, parseContracts } from "../domain/storage";

const EMPTY: ContractApplication[] = [];
const store = createLocalStore<ContractApplication[]>({
  key: CONTRACTS_KEY,
  parse: parseContracts,
  empty: EMPTY,
});

/** The contract applications of one person. With a server this becomes calls to the backend. */
export function useContracts(ownerId: string | null) {
  const all = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const mine = useMemo(
    () => (ownerId ? all.filter((item) => item.ownerId === ownerId) : EMPTY),
    [all, ownerId],
  );

  const add = useCallback((application: ContractApplication) => {
    store.write([application, ...store.getSnapshot()].slice(0, MAX_CONTRACTS));
  }, []);

  /** Replaces an application with its changed copy (same id). */
  const replace = useCallback((changed: ContractApplication) => {
    store.write(store.getSnapshot().map((item) => (item.id === changed.id ? changed : item)));
  }, []);

  /** The next free number, looking at every application in this browser. */
  const takeNumber = useCallback((now: Date) => nextContractNumber(store.getSnapshot(), now), []);

  return { mine, add, replace, takeNumber };
}

/** Every application in this browser, for the cabinet of an organization (spec 12.2). */
export function useAllContracts() {
  const all = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const replace = useCallback((changed: ContractApplication) => {
    store.write(store.getSnapshot().map((item) => (item.id === changed.id ? changed : item)));
  }, []);
  return { all, replace };
}
