"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createLocalStore } from "@/shared/lib/local-store";
import {
  AUDIT_KEY,
  MAX_AUDIT,
  createAuditEntry,
  parseAudit,
  type AuditEntry,
} from "../domain/audit";

const EMPTY: AuditEntry[] = [];
const store = createLocalStore<AuditEntry[]>({ key: AUDIT_KEY, parse: parseAudit, empty: EMPTY });

/** The journal of what employees did (spec 12.7). Lines are only ever added. */
export function useAudit() {
  const entries = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  const log = useCallback((input: Omit<AuditEntry, "id" | "at">) => {
    const entry = createAuditEntry(input, crypto.randomUUID(), new Date());
    store.write([entry, ...store.getSnapshot()].slice(0, MAX_AUDIT));
  }, []);

  return { entries, log };
}
