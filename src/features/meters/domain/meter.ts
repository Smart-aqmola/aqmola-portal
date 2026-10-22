import type { ContractSector } from "@/features/account/domain/availability";

/** Resources that have a meter in the home (spec 6.3). Sewerage and waste have no meters. */
export const meterResources = ["electricity", "cold_water", "hot_water", "heat", "gas"] as const;
export type MeterResource = (typeof meterResources)[number];

/** The utility whose provider looks after a meter: both kinds of water belong to the water supplier. */
export function sectorOfResource(resource: MeterResource): ContractSector {
  return resource === "cold_water" || resource === "hot_water" ? "water" : resource;
}

export const meterTypes = ["mechanical", "electronic", "smart"] as const;
export type MeterType = (typeof meterTypes)[number];

/** The state of the device itself (spec 6.3). A replaced or removed meter keeps its history (8.11). */
export const meterStates = ["working", "faulty", "removed", "replaced"] as const;
export type MeterState = (typeof meterStates)[number];

export const eventKinds = [
  "installed",
  "replaced",
  "removed",
  "sealed",
  "unsealed",
  "verified",
  "fault",
] as const;
export type MeterEventKind = (typeof eventKinds)[number];

/** One line of the history of a meter: installation, replacement, sealing, verification (spec 8.11). */
export type MeterEvent = { kind: MeterEventKind; at: string; note?: string };

export type Meter = {
  id: string;
  ownerId: string;
  propertyId: string;
  /** The address as written when the meter was added, so the card stays readable later. */
  address: string;
  resource: MeterResource;
  type: MeterType;
  manufacturer: string;
  model: string;
  serial: string;
  personalAccount: string;
  /** ISO dates; "" when unknown. */
  installedAt: string;
  commissionedAt: string;
  lastVerifiedAt: string;
  nextVerificationAt: string;
  sealNumber: string;
  sealedAt: string;
  state: MeterState;
  /** How many digits stand before the decimal point and after it (spec 7.5: "digit capacity"). */
  digits: number;
  decimals: number;
  /** The reading when the meter was added (spec 6.5). */
  initialReading: number;
  history: MeterEvent[];
  createdAt: string;
};

export const MAX_METERS = 30;
export const MAX_SERIAL = 40;
export const MAX_TEXT = 60;
const ACCOUNT = /^\d{6,12}$/;
const SERIAL = /^[\p{L}\d][\p{L}\d\s./-]*$/u;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const DIGIT_CHOICES = [4, 5, 6, 7, 8] as const;
export const DECIMAL_CHOICES = [0, 1, 2, 3] as const;

export type MeterInput = {
  resource: MeterResource | "";
  type: MeterType | "";
  manufacturer: string;
  model: string;
  serial: string;
  personalAccount: string;
  installedAt: string;
  commissionedAt: string;
  lastVerifiedAt: string;
  nextVerificationAt: string;
  sealNumber: string;
  sealedAt: string;
  digits: string;
  decimals: string;
  initialReading: string;
};

export type MeterField = keyof MeterInput;
/** `required` | `long` | `format` | `future` | `order` | `duplicate`: the form turns it into text. */
export type MeterErrors = Partial<Record<MeterField, string>>;

export const emptyMeterInput = (personalAccount = ""): MeterInput => ({
  resource: "",
  type: "",
  manufacturer: "",
  model: "",
  serial: "",
  personalAccount,
  installedAt: "",
  commissionedAt: "",
  lastVerifiedAt: "",
  nextVerificationAt: "",
  sealNumber: "",
  sealedAt: "",
  digits: "5",
  decimals: "0",
  initialReading: "",
});

/**
 * A reading typed by a person: "1 234,5", "1234.5". Returns null when it is not a plain
 * non-negative number; a minus sign is reported separately by `readingProblem`.
 */
export function parseReading(text: string): number | null {
  const clean = text.trim().replace(/\s+/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  return Number(clean);
}

/** Why a typed reading cannot be taken for a meter of this capacity, or null (spec 7.5). */
export function readingProblem(
  text: string,
  capacity: { digits: number; decimals: number },
): "required" | "negative" | "format" | "digits" | "whole" | "decimals" | null {
  const clean = text.trim().replace(/\s+/g, "").replace(",", ".");
  if (!clean) return "required";
  if (clean.startsWith("-")) return "negative";
  const value = parseReading(clean);
  if (value === null) return "format";
  const [whole, fraction = ""] = clean.split(".");
  if (whole.replace(/^0+(?=\d)/, "").length > capacity.digits) return "digits";
  if (fraction && capacity.decimals === 0) return "whole";
  if (fraction.length > capacity.decimals) return "decimals";
  return null;
}

function isFuture(isoDate: string, today: Date): boolean {
  return isoDate > today.toISOString().slice(0, 10);
}

function checkDate(value: string, today: Date, required: boolean): string | undefined {
  if (!value) return required ? "required" : undefined;
  if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) return "format";
  if (isFuture(value, today)) return "future";
  return undefined;
}

/** Checks the form for a new meter (spec 6.5): resource, serial number and first reading are needed. */
export function validateMeter(
  input: MeterInput,
  today: Date,
  existing: readonly Pick<Meter, "serial" | "resource" | "state">[] = [],
): MeterErrors {
  const errors: MeterErrors = {};
  if (!input.resource) errors.resource = "required";
  if (!input.type) errors.type = "required";

  const serial = input.serial.trim();
  if (!serial) errors.serial = "required";
  else if (serial.length > MAX_SERIAL) errors.serial = "long";
  else if (!SERIAL.test(serial)) errors.serial = "format";
  else if (
    existing.some(
      (meter) =>
        isActive(meter) &&
        meter.resource === input.resource &&
        meter.serial.toLowerCase() === serial.toLowerCase(),
    )
  ) {
    errors.serial = "duplicate";
  }

  for (const key of ["manufacturer", "model", "sealNumber"] as const) {
    if (input[key].trim().length > MAX_TEXT) errors[key] = "long";
  }
  if (input.personalAccount.trim() && !ACCOUNT.test(input.personalAccount.trim())) {
    errors.personalAccount = "format";
  }

  const installed = checkDate(input.installedAt, today, true);
  if (installed) errors.installedAt = installed;
  for (const key of ["commissionedAt", "lastVerifiedAt", "sealedAt"] as const) {
    const problem = checkDate(input[key], today, false);
    if (problem) errors[key] = problem;
  }
  if (input.nextVerificationAt) {
    if (!ISO_DATE.test(input.nextVerificationAt)) errors.nextVerificationAt = "format";
    else if (input.lastVerifiedAt && input.nextVerificationAt <= input.lastVerifiedAt) {
      errors.nextVerificationAt = "order";
    }
  }
  if (!errors.installedAt && !errors.commissionedAt && input.commissionedAt) {
    if (input.commissionedAt < input.installedAt) errors.commissionedAt = "order";
  }
  if (input.sealedAt && !input.sealNumber.trim()) errors.sealNumber = "required";

  const capacity = { digits: Number(input.digits), decimals: Number(input.decimals) };
  const reading = readingProblem(input.initialReading, capacity);
  if (reading) errors.initialReading = reading;
  return errors;
}

/** Builds the meter from a form that passed `validateMeter`. */
export function createMeter(
  input: MeterInput,
  context: { id: string; ownerId: string; propertyId: string; address: string },
  now: Date,
): Meter {
  if (!input.resource || !input.type) throw new Error("A meter needs a resource and a type");
  const events: MeterEvent[] = [{ kind: "installed", at: input.installedAt }];
  if (input.sealedAt) {
    events.push({ kind: "sealed", at: input.sealedAt, note: input.sealNumber.trim() });
  }
  if (input.lastVerifiedAt) events.push({ kind: "verified", at: input.lastVerifiedAt });
  return {
    id: context.id,
    ownerId: context.ownerId,
    propertyId: context.propertyId,
    address: context.address,
    resource: input.resource,
    type: input.type,
    manufacturer: input.manufacturer.trim(),
    model: input.model.trim(),
    serial: input.serial.trim(),
    personalAccount: input.personalAccount.trim(),
    installedAt: input.installedAt,
    commissionedAt: input.commissionedAt,
    lastVerifiedAt: input.lastVerifiedAt,
    nextVerificationAt: input.nextVerificationAt,
    sealNumber: input.sealNumber.trim(),
    sealedAt: input.sealedAt,
    state: "working",
    digits: Number(input.digits),
    decimals: Number(input.decimals),
    initialReading: parseReading(input.initialReading) ?? 0,
    history: events.sort((a, b) => a.at.localeCompare(b.at)),
    createdAt: now.toISOString(),
  };
}

/** A meter that takes readings and requests. A replaced or removed one only keeps its history. */
export function isActive(meter: Pick<Meter, "state">): boolean {
  return meter.state === "working" || meter.state === "faulty";
}

/** Adds a line to the history, keeping it in date order (spec 8.11). */
export function withEvent(meter: Meter, event: MeterEvent): Meter {
  return { ...meter, history: [...meter.history, event].sort((a, b) => a.at.localeCompare(b.at)) };
}
