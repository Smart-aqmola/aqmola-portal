/** What an employee's action changed (spec 12.7). */
export const auditEntities = [
  "service_application",
  "contract",
  "meter_request",
  "reading",
  "appeal",
] as const;
export type AuditEntity = (typeof auditEntities)[number];

export const auditActions = ["status", "account"] as const;
export type AuditAction = (typeof auditActions)[number];

/** One line of the journal: who, when, what and from what to what. Lines are never changed or deleted. */
export type AuditEntry = {
  id: string;
  /** ISO date and time. */
  at: string;
  organizationId: string;
  actor: string;
  entity: AuditEntity;
  entityId: string;
  number: string;
  action: AuditAction;
  from?: string;
  to?: string;
  note?: string;
};

export const AUDIT_KEY = "aqmola:audit";
export const MAX_AUDIT = 300;

export function createAuditEntry(
  input: Omit<AuditEntry, "id" | "at">,
  id: string,
  now: Date,
): AuditEntry {
  const { note, from, to, ...rest } = input;
  return {
    id,
    at: now.toISOString(),
    ...rest,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(note?.trim() ? { note: note.trim().slice(0, 400) } : {}),
  };
}

const ID = /^[a-z0-9-]{1,60}$/;
const isText = (value: unknown, max = 200): value is string =>
  typeof value === "string" && value.length <= max;
const isOneOf = (value: unknown, list: readonly string[]): boolean =>
  typeof value === "string" && list.includes(value);

function isEntry(value: unknown): value is AuditEntry {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    isText(e.id, 60) &&
    ID.test(e.id) &&
    isText(e.at, 40) &&
    isText(e.organizationId, 100) &&
    isText(e.actor, 100) &&
    isOneOf(e.entity, auditEntities) &&
    isText(e.entityId, 100) &&
    isText(e.number, 40) &&
    isOneOf(e.action, auditActions) &&
    (e.from === undefined || isText(e.from, 60)) &&
    (e.to === undefined || isText(e.to, 60)) &&
    (e.note === undefined || isText(e.note, 400))
  );
}

/** Reads the saved journal defensively: anything unexpected in storage is dropped. */
export function parseAudit(raw: string | null): AuditEntry[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(isEntry).slice(0, MAX_AUDIT);
  } catch {
    return [];
  }
}
