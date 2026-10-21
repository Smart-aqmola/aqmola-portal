import { isValidIinShape } from "./iin";
import { normalizePhone } from "./phone";
import type { Profile } from "./profile";

export const PROFILES_KEY = "aqmola:profiles";
export const MAX_PROFILES = 50;

const isText = (value: unknown, max = 120): value is string =>
  typeof value === "string" && value.length <= max;

function isProfile(value: unknown): value is Profile {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    isText(p.id, 60) &&
    /^[a-z0-9-]{1,60}$/.test(p.id) &&
    isText(p.lastName, 60) &&
    p.lastName !== "" &&
    isText(p.firstName, 60) &&
    p.firstName !== "" &&
    (p.middleName === undefined || isText(p.middleName, 60)) &&
    typeof p.iin === "string" &&
    isValidIinShape(p.iin) &&
    typeof p.phone === "string" &&
    normalizePhone(p.phone) === p.phone &&
    (p.email === undefined || isText(p.email, 100)) &&
    isText(p.createdAt, 40)
  );
}

/** Reads saved profiles defensively: anything unexpected in storage is dropped. */
export function parseProfiles(raw: string | null): Profile[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(isProfile).slice(0, MAX_PROFILES);
  } catch {
    return [];
  }
}
