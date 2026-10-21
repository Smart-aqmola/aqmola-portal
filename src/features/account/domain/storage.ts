import { isValidIinShape } from "./iin";
import { normalizePhone } from "./phone";
import { MAX_FILES } from "@/shared/lib/upload-rules";
import type { Profile } from "./profile";
import {
  MAX_HOUSE,
  MAX_OWNER_INFO,
  MAX_PLACE,
  MAX_PROPERTIES,
  propertyTypes,
  relations,
  verificationStatuses,
  type Property,
  type StoredFile,
  type Verification,
} from "./property";

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

export const PROPERTIES_KEY = "aqmola:properties";

const ID = /^[a-z0-9-]{1,60}$/;
const flatOrHouse = (value: unknown) => value === undefined || isText(value, MAX_HOUSE);

function isStoredFile(value: unknown): value is StoredFile {
  if (typeof value !== "object" || value === null) return false;
  const file = value as Record<string, unknown>;
  return isText(file.name, 200) && typeof file.size === "number" && file.size >= 0;
}

function isVerification(value: unknown): value is Verification {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.status === "string" &&
    (verificationStatuses as readonly string[]).includes(v.status) &&
    (v.method === undefined || v.method === "state_integration" || v.method === "document") &&
    Array.isArray(v.documents) &&
    v.documents.length <= MAX_FILES &&
    v.documents.every(isStoredFile) &&
    (v.note === undefined || isText(v.note, 200)) &&
    (v.at === undefined || isText(v.at, 40))
  );
}

function isProperty(value: unknown): value is Property {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    isText(p.id, 60) &&
    ID.test(p.id) &&
    isText(p.ownerId, 60) &&
    ID.test(p.ownerId) &&
    isText(p.territoryId, 100) &&
    ID.test(p.territoryId) &&
    isText(p.locality, MAX_PLACE) &&
    isText(p.street, MAX_PLACE) &&
    isText(p.house, MAX_HOUSE) &&
    flatOrHouse(p.flat) &&
    typeof p.type === "string" &&
    (propertyTypes as readonly string[]).includes(p.type) &&
    typeof p.relation === "string" &&
    (relations as readonly string[]).includes(p.relation) &&
    (p.personalAccount === undefined ||
      (typeof p.personalAccount === "string" && /^\d{6,12}$/.test(p.personalAccount))) &&
    isText(p.ownerInfo, MAX_OWNER_INFO) &&
    (p.addressId === undefined || (isText(p.addressId, 80) && ID.test(p.addressId))) &&
    isVerification(p.verification) &&
    typeof p.version === "number" &&
    isText(p.createdAt, 40)
  );
}

/** Reads saved objects defensively: anything unexpected in storage is dropped. */
export function parseProperties(raw: string | null): Property[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(isProperty).slice(0, MAX_PROPERTIES);
  } catch {
    return [];
  }
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
