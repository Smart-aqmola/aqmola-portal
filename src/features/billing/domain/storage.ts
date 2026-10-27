import { CONTRACT_SECTORS } from "@/features/catalog/domain/contract-services";
import {
  MAX_NOTICES,
  MAX_PAYMENTS,
  NUMBER_PATTERN,
  paymentMethods,
  paymentStatuses,
  type Payment,
} from "./payment";
import { isId, isObject, isOneOf, isText, parseList } from "@/shared/lib/stored-data";

export const PAYMENTS_KEY = "aqmola:payments";

const isAmount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 1e10;

function isLine(value: unknown): boolean {
  return (
    isObject(value) &&
    isText(value.chargeId, 120) &&
    isText(value.providerId, 100) &&
    isText(value.providerName, 200) &&
    isOneOf(value.sector, CONTRACT_SECTORS) &&
    isText(value.personalAccount, 20) &&
    isAmount(value.amount)
  );
}

function isEntry(value: unknown): boolean {
  return (
    isObject(value) &&
    isOneOf(value.status, paymentStatuses) &&
    isText(value.at, 40) &&
    (value.actor === "applicant" || value.actor === "gateway") &&
    (value.note === undefined || isText(value.note, 200))
  );
}

function isPayment(value: unknown): value is Payment {
  if (!isObject(value)) return false;
  const p = value;
  return (
    isId(p.id) &&
    isId(p.ownerId) &&
    isId(p.propertyId) &&
    isText(p.address, 300) &&
    isText(p.period, 7) &&
    /^\d{4}-\d{2}$/.test(p.period) &&
    isText(p.number, 30) &&
    NUMBER_PATTERN.test(p.number) &&
    isOneOf(p.method, paymentMethods) &&
    isText(p.reference, 20) &&
    Array.isArray(p.lines) &&
    p.lines.length >= 1 &&
    p.lines.length <= 10 &&
    p.lines.every(isLine) &&
    isAmount(p.total) &&
    isOneOf(p.status, paymentStatuses) &&
    Array.isArray(p.history) &&
    p.history.length <= 30 &&
    p.history.every(isEntry) &&
    Array.isArray(p.notices) &&
    p.notices.length <= MAX_NOTICES &&
    p.notices.every((id) => isText(id, 80)) &&
    isText(p.createdAt, 40) &&
    isText(p.updatedAt, 40)
  );
}

/** Reads saved payments defensively: anything unexpected in storage is dropped. */
export function parsePayments(raw: string | null): Payment[] {
  return parseList(raw, isPayment, MAX_PAYMENTS);
}
