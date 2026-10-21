import { CONTRACT_SECTORS } from "@/features/account/domain/availability";
import { propertyTypes, relations } from "@/features/account/domain/property";
import { MAX_FILES } from "@/shared/lib/upload-rules";
import {
  MAX_CONTRACTS,
  NUMBER_PATTERN,
  contractStatuses,
  documentKeys,
  notifyChannels,
  type ContractApplication,
  type Signature,
} from "./contract";

export const CONTRACTS_KEY = "aqmola:contracts";

const ID = /^[a-z0-9-]{1,60}$/;
const isText = (value: unknown, max = 200): value is string =>
  typeof value === "string" && value.length <= max;
const isOneOf = (value: unknown, list: readonly string[]): boolean =>
  typeof value === "string" && list.includes(value);
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isSignature(value: unknown): value is Signature {
  return (
    isObject(value) &&
    isText(value.name, 120) &&
    isText(value.at, 40) &&
    value.method === "demo_ecp"
  );
}

function isApplicant(value: unknown): boolean {
  return (
    isObject(value) &&
    isText(value.lastName, 80) &&
    isText(value.firstName, 80) &&
    isText(value.middleName, 80) &&
    isText(value.iin, 20) &&
    isText(value.phone, 30) &&
    isText(value.email, 120)
  );
}

function isHistory(value: unknown): boolean {
  return (
    isObject(value) &&
    isOneOf(value.status, contractStatuses) &&
    isText(value.at, 40) &&
    (value.actor === "applicant" || value.actor === "provider") &&
    (value.note === undefined || isText(value.note, 400))
  );
}

function isAttachment(value: unknown): boolean {
  return (
    isObject(value) &&
    isOneOf(value.key, documentKeys) &&
    isText(value.name, 200) &&
    typeof value.size === "number" &&
    value.size >= 0
  );
}

function isContract(value: unknown): value is ContractApplication {
  if (!isObject(value)) return false;
  const c = value;
  const meter = c.meter;
  const consents = c.consents;
  const signatures = c.signatures;
  return (
    isText(c.id, 60) &&
    ID.test(c.id) &&
    isText(c.ownerId, 60) &&
    ID.test(c.ownerId) &&
    isText(c.propertyId, 60) &&
    ID.test(c.propertyId) &&
    isOneOf(c.sector, CONTRACT_SECTORS) &&
    isText(c.serviceSlug, 100) &&
    isText(c.serviceTitle, 300) &&
    isText(c.providerId, 100) &&
    isText(c.providerName, 200) &&
    (c.number === undefined || (isText(c.number, 30) && NUMBER_PATTERN.test(c.number))) &&
    isApplicant(c.applicant) &&
    isText(c.address, 300) &&
    isOneOf(c.propertyType, propertyTypes) &&
    isOneOf(c.basis, relations) &&
    isText(c.rightSince, 12) &&
    isText(c.personalAccount, 20) &&
    isText(c.previousContract, 200) &&
    isObject(meter) &&
    typeof meter.has === "boolean" &&
    isText(meter.serial, 60) &&
    isText(meter.reading, 30) &&
    isOneOf(c.notifyBy, notifyChannels) &&
    Array.isArray(c.attachments) &&
    c.attachments.length <= MAX_FILES + 5 &&
    c.attachments.every(isAttachment) &&
    isObject(consents) &&
    typeof consents.personalData === "boolean" &&
    typeof consents.terms === "boolean" &&
    isObject(signatures) &&
    (signatures.application === undefined || isSignature(signatures.application)) &&
    (signatures.contractApplicant === undefined || isSignature(signatures.contractApplicant)) &&
    (signatures.contractProvider === undefined || isSignature(signatures.contractProvider)) &&
    isOneOf(c.status, contractStatuses) &&
    Array.isArray(c.history) &&
    c.history.length <= 60 &&
    c.history.every(isHistory) &&
    (c.remarks === undefined || isText(c.remarks, 400)) &&
    (c.submittedAt === undefined || isText(c.submittedAt, 40)) &&
    (c.startsAt === undefined || isText(c.startsAt, 40)) &&
    typeof c.version === "number" &&
    isText(c.createdAt, 40) &&
    isText(c.updatedAt, 40)
  );
}

/** Reads saved contract applications defensively: anything unexpected in storage is dropped. */
export function parseContracts(raw: string | null): ContractApplication[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(isContract).slice(0, MAX_CONTRACTS);
  } catch {
    return [];
  }
}
