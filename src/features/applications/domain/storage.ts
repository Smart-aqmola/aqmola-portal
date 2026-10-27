import { NUMBER_PATTERN, type Application, type HistoryEntry } from "./application";
import { isStatus } from "./status";

export const APPLICATIONS_KEY = "aqmola:applications";
export const MAX_APPLICATIONS = 200;

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const isText = (value: unknown, max = 400): value is string =>
  typeof value === "string" && value.length <= max;

function isHistory(value: unknown): value is HistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    isStatus(entry.status) &&
    isText(entry.at, 40) &&
    (entry.note === undefined || isText(entry.note))
  );
}

function isApplication(value: unknown): value is Application {
  if (typeof value !== "object" || value === null) return false;
  const a = value as Record<string, unknown>;
  const form = a.form as Record<string, unknown> | undefined;
  return (
    typeof a.number === "string" &&
    NUMBER_PATTERN.test(a.number) &&
    isText(a.serviceSlug, 100) &&
    isText(a.serviceTitle) &&
    isText(a.organizationId, 100) &&
    (a.ownerRole === "resident" || a.ownerRole === "business") &&
    isText(a.ownerName, 100) &&
    isStatus(a.status) &&
    typeof a.version === "number" &&
    isText(a.createdAt, 40) &&
    typeof form === "object" &&
    form !== null &&
    isText(form.territoryId, 100) &&
    isText(form.address) &&
    isText(form.comment) &&
    Array.isArray(form.attached) &&
    Array.isArray(a.history) &&
    a.history.every(isHistory)
  );
}

/** Read saved applications defensively: anything unexpected in storage is dropped. */
export function parseApplications(raw: string | null): Application[] {
  const value = parseJson(raw);
  if (!Array.isArray(value)) return [];
  return value.filter(isApplication).slice(0, MAX_APPLICATIONS);
}
