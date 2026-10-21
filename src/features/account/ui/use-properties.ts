"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createLocalStore } from "@/shared/lib/local-store";
import { MAX_PROPERTIES, type Property } from "../domain/property";
import { PROPERTIES_KEY, parseProperties } from "../domain/storage";

const EMPTY: Property[] = [];
const store = createLocalStore<Property[]>({
  key: PROPERTIES_KEY,
  parse: parseProperties,
  empty: EMPTY,
});

/** The objects of one owner. With a server this becomes calls to the backend. */
export function useProperties(ownerId: string | null) {
  const all = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const mine = useMemo(
    () => (ownerId ? all.filter((item) => item.ownerId === ownerId) : EMPTY),
    [all, ownerId],
  );

  const add = useCallback((property: Property) => {
    store.write([property, ...store.getSnapshot()].slice(0, MAX_PROPERTIES));
  }, []);

  /** Replaces an object with its changed copy (same id). */
  const replace = useCallback((changed: Property) => {
    store.write(store.getSnapshot().map((item) => (item.id === changed.id ? changed : item)));
  }, []);

  return { mine, count: all.length, add, replace };
}

/** Every object in this browser, for the cabinet of an organization (spec 12.3). */
export function useAllProperties() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
