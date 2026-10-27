import { CONTRACT_SECTORS } from "@/features/catalog/domain/contract-services";
import {
  EXTERNAL_PATTERN,
  MAX_APPEALS,
  MAX_EVENTS,
  NUMBER_PATTERN,
  appealCategories,
  appealStatuses,
  subcategories,
  type Appeal,
} from "./appeal";
import { isFile, isId, isObject, isOneOf, isText, parseList } from "@/shared/lib/stored-data";

export const APPEALS_KEY = "aqmola:appeals";

function isEvent(value: unknown): boolean {
  return (
    isObject(value) &&
    isText(value.at, 40) &&
    (value.actor === "applicant" || value.actor === "executor") &&
    (value.status === undefined || isOneOf(value.status, appealStatuses)) &&
    (value.text === undefined || isText(value.text, 600))
  );
}

function isAppeal(value: unknown): value is Appeal {
  if (!isObject(value)) return false;
  const a = value;
  const violation = a.violation;
  return (
    isId(a.id) &&
    isId(a.ownerId) &&
    isText(a.number, 30) &&
    NUMBER_PATTERN.test(a.number) &&
    isOneOf(a.category, appealCategories) &&
    isText(a.subcategory, 40) &&
    isOneOf(a.category, appealCategories) &&
    subcategories[a.category as keyof typeof subcategories].includes(a.subcategory) &&
    (a.sector === undefined || isOneOf(a.sector, CONTRACT_SECTORS)) &&
    (a.propertyId === undefined || isId(a.propertyId)) &&
    isText(a.address, 300) &&
    isText(a.description, 1200) &&
    isText(a.contactPhone, 30) &&
    isText(a.contactEmail, 120) &&
    Array.isArray(a.attachments) &&
    a.attachments.length <= 10 &&
    a.attachments.every(isFile) &&
    (violation === undefined ||
      (isObject(violation) &&
        isText(violation.date, 12) &&
        isText(violation.time, 6) &&
        isText(violation.duration, 4) &&
        (violation.unit === "hours" || violation.unit === "days"))) &&
    isText(a.organizationId, 100) &&
    isText(a.organizationName, 200) &&
    (a.external === undefined ||
      (isObject(a.external) &&
        isText(a.external.number, 20) &&
        EXTERNAL_PATTERN.test(a.external.number))) &&
    isOneOf(a.status, appealStatuses) &&
    Array.isArray(a.events) &&
    a.events.length <= MAX_EVENTS &&
    a.events.every(isEvent) &&
    isText(a.createdAt, 40) &&
    isText(a.updatedAt, 40)
  );
}

/** Reads saved appeals defensively: anything unexpected in storage is dropped. */
export function parseAppeals(raw: string | null): Appeal[] {
  return parseList(raw, isAppeal, MAX_APPEALS);
}
