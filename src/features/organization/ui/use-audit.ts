"use client";

import { createCollection } from "@/shared/lib/collection";
import {
  AUDIT_KEY,
  MAX_AUDIT,
  createAuditEntry,
  parseAudit,
  type AuditEntry,
} from "../domain/audit";

const audit = createCollection<AuditEntry>({ key: AUDIT_KEY, parse: parseAudit, max: MAX_AUDIT });

/** Adds a line to the journal of what employees did (spec 12.7). Lines are only ever added. */
function log(input: Omit<AuditEntry, "id" | "at">) {
  audit.add(createAuditEntry(input, crypto.randomUUID(), new Date()));
}

export function useAudit() {
  return { entries: audit.useAll(), log };
}
