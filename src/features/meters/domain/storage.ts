import {
  MAX_METERS,
  eventKinds,
  meterResources,
  meterStates,
  meterTypes,
  type Meter,
} from "./meter";
import {
  MAX_READINGS,
  NUMBER_PATTERN as READING_NUMBER,
  readingStatuses,
  type Reading,
} from "./reading";
import {
  MAX_REQUESTS,
  NUMBER_PATTERN as REQUEST_NUMBER,
  requestKinds,
  requestStatuses,
  timeSlots,
  type MeterRequest,
} from "./meter-request";
import { isFile, isId, isObject, isOneOf, isText, parseList } from "@/shared/lib/stored-data";

export const METERS_KEY = "aqmola:meters";
export const READINGS_KEY = "aqmola:readings";
export const METER_REQUESTS_KEY = "aqmola:meter-requests";

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

function isMeter(value: unknown): value is Meter {
  if (!isObject(value)) return false;
  const m = value;
  return (
    isId(m.id) &&
    isId(m.ownerId) &&
    isId(m.propertyId) &&
    isText(m.address, 300) &&
    isOneOf(m.resource, meterResources) &&
    isOneOf(m.type, meterTypes) &&
    isText(m.manufacturer, 80) &&
    isText(m.model, 80) &&
    isText(m.serial, 60) &&
    isText(m.personalAccount, 20) &&
    isText(m.installedAt, 12) &&
    isText(m.commissionedAt, 12) &&
    isText(m.lastVerifiedAt, 12) &&
    isText(m.nextVerificationAt, 12) &&
    isText(m.sealNumber, 80) &&
    isText(m.sealedAt, 12) &&
    isOneOf(m.state, meterStates) &&
    typeof m.digits === "number" &&
    m.digits >= 1 &&
    m.digits <= 12 &&
    typeof m.decimals === "number" &&
    m.decimals >= 0 &&
    m.decimals <= 4 &&
    isNumber(m.initialReading) &&
    Array.isArray(m.history) &&
    m.history.length <= 60 &&
    m.history.every(
      (event) =>
        isObject(event) &&
        isOneOf(event.kind, eventKinds) &&
        isText(event.at, 12) &&
        (event.note === undefined || isText(event.note, 120)),
    ) &&
    isText(m.createdAt, 40)
  );
}

function isHistory(value: unknown, statuses: readonly string[]): boolean {
  return (
    isObject(value) &&
    isOneOf(value.status, statuses) &&
    isText(value.at, 40) &&
    (value.actor === "applicant" || value.actor === "provider") &&
    (value.note === undefined || isText(value.note, 400))
  );
}

function isReading(value: unknown): value is Reading {
  if (!isObject(value)) return false;
  const r = value;
  return (
    isId(r.id) &&
    isId(r.ownerId) &&
    isId(r.meterId) &&
    isId(r.propertyId) &&
    isText(r.number, 30) &&
    READING_NUMBER.test(r.number) &&
    isNumber(r.value) &&
    isText(r.readingDate, 12) &&
    (r.photo === undefined || isFile(r.photo)) &&
    isNumber(r.previousValue) &&
    isText(r.previousDate, 12) &&
    isOneOf(r.status, readingStatuses) &&
    Array.isArray(r.history) &&
    r.history.length <= 20 &&
    r.history.every((entry) => isHistory(entry, readingStatuses)) &&
    (r.providerNote === undefined || isText(r.providerNote, 400)) &&
    isText(r.submittedAt, 40)
  );
}

function isSlot(value: unknown): boolean {
  return isObject(value) && isText(value.date, 12) && isOneOf(value.time, timeSlots);
}

function isRequest(value: unknown): value is MeterRequest {
  if (!isObject(value)) return false;
  const q = value;
  const details = q.details;
  const result = q.result;
  return (
    isId(q.id) &&
    isId(q.ownerId) &&
    isId(q.propertyId) &&
    isText(q.address, 300) &&
    isText(q.number, 30) &&
    REQUEST_NUMBER.test(q.number) &&
    isOneOf(q.kind, requestKinds) &&
    isOneOf(q.resource, meterResources) &&
    (q.meterId === undefined || isId(q.meterId)) &&
    isText(q.reason, 40) &&
    isObject(details) &&
    Object.values(details).every((item) => isText(item, 300)) &&
    isText(q.currentReading, 30) &&
    isText(q.contactPhone, 30) &&
    Array.isArray(q.slots) &&
    q.slots.length <= 3 &&
    q.slots.every(isSlot) &&
    isText(q.comment, 500) &&
    Array.isArray(q.attachments) &&
    q.attachments.length <= 10 &&
    q.attachments.every(isFile) &&
    isOneOf(q.status, requestStatuses) &&
    Array.isArray(q.history) &&
    q.history.length <= 40 &&
    q.history.every((entry) => isHistory(entry, requestStatuses)) &&
    (q.scheduled === undefined || isSlot(q.scheduled)) &&
    (q.assignee === undefined || isText(q.assignee, 80)) &&
    (q.remarks === undefined || isText(q.remarks, 500)) &&
    (result === undefined ||
      (isObject(result) &&
        isText(result.at, 12) &&
        (result.newSerial === undefined || isText(result.newSerial, 60)) &&
        (result.reading === undefined || isText(result.reading, 30)) &&
        (result.seal === undefined || isText(result.seal, 80)) &&
        (result.nextVerification === undefined || isText(result.nextVerification, 12)))) &&
    isText(q.createdAt, 40) &&
    isText(q.updatedAt, 40)
  );
}

/** Reads saved data defensively: anything unexpected in storage is dropped. */
export const parseMeters = (raw: string | null): Meter[] => parseList(raw, isMeter, MAX_METERS);
export const parseReadings = (raw: string | null): Reading[] =>
  parseList(raw, isReading, MAX_READINGS);
export const parseMeterRequests = (raw: string | null): MeterRequest[] =>
  parseList(raw, isRequest, MAX_REQUESTS);
