import {
  NUMBER_PATTERN,
  type ApplicantRole,
  type Application,
  type DemoRole,
  type HistoryEntry,
} from "./application";
import { isStatus } from "./status";

export const SESSION_KEY = "aqmola:session";
export const APPLICATIONS_KEY = "aqmola:applications";
export const MAX_APPLICATIONS = 200;

export type DemoSession = {
  role: DemoRole;
  name: string;
  organizationId?: string;
  /** Set when a registered resident signed in; links the session to the saved profile. */
  userId?: string;
};

/** The only people who can "sign in": fictional, picked on the sign-in page. */
export const DEMO_PROFILES = {
  resident: { role: "resident", name: "Демо Житель" },
  business: { role: "business", name: "ТОО «Демо-Бизнес»" },
} as const satisfies Record<ApplicantRole, DemoSession>;

const ORGANIZATION_ID = /^[a-z0-9-]{1,60}$/;
const USER_ID = /^[a-z0-9-]{1,60}$/;

/** A registered resident: the name comes from the profile, the id points back at it. */
export function residentSession(userId: string, name: string): DemoSession {
  return { role: "resident", name, userId };
}

/** Who owns saved data (objects, drafts): the registered user, or the shared demo profile. */
export function ownerIdOf(session: Pick<DemoSession, "role" | "userId">): string {
  return session.userId ?? `demo-${session.role}`;
}

/** The operator works for one organization, chosen at sign-in. */
export function operatorSession(organizationId: string): DemoSession {
  return { role: "operator", name: "Демо Оператор", organizationId };
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const isNameText = (value: string) => value.trim() !== "" && value.length <= 100;

export function parseSession(raw: string | null): DemoSession | null {
  const value = parseJson(raw);
  if (typeof value !== "object" || value === null) return null;
  const { role, name, organizationId, userId } = value as Record<string, unknown>;
  if (role === "resident" && typeof userId === "string") {
    const valid = USER_ID.test(userId) && typeof name === "string" && isNameText(name);
    return valid ? residentSession(userId, name as string) : null;
  }
  if (role === "operator") {
    const valid = typeof organizationId === "string" && ORGANIZATION_ID.test(organizationId);
    return valid && name === operatorSession(organizationId).name
      ? operatorSession(organizationId)
      : null;
  }
  if (role !== "resident" && role !== "business") return null;
  const profile = DEMO_PROFILES[role];
  return name === profile.name ? profile : null;
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
