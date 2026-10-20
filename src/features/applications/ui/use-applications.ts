"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createLocalStore } from "@/shared/lib/local-store";
import { useHydrated } from "@/shared/lib/use-hydrated";
import { nextNumber, type Application } from "../domain/application";
import { APPLICATIONS_KEY, MAX_APPLICATIONS, parseApplications } from "../domain/storage";

const EMPTY: Application[] = [];
const store = createLocalStore<Application[]>({
  key: APPLICATIONS_KEY,
  parse: parseApplications,
  empty: EMPTY,
});

/** All applications made in this browser. The operator cabinet reads the same list. */
export function useApplications() {
  const applications = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const ready = useHydrated();

  /** Takes a free number, builds the application with `make` and saves it. Returns it. */
  const add = useCallback((make: (number: string) => Application): Application => {
    const current = store.getSnapshot();
    const created = make(nextNumber(current, new Date()));
    store.write([created, ...current].slice(0, MAX_APPLICATIONS));
    return created;
  }, []);

  /** Saves several new applications at once; `make` gets the list as it is now. */
  const addMany = useCallback((make: (existing: Application[]) => Application[]) => {
    const current = store.getSnapshot();
    store.write([...make(current).reverse(), ...current].slice(0, MAX_APPLICATIONS));
  }, []);

  /** Replaces an application with its changed copy (same number). */
  const replace = useCallback((changed: Application) => {
    store.write(
      store.getSnapshot().map((item) => (item.number === changed.number ? changed : item)),
    );
  }, []);

  return { applications, ready, add, addMany, replace };
}
