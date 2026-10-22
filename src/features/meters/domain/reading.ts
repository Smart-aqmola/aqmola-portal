import type { StoredFile } from "@/features/account/domain/property";
import { checkFile } from "@/shared/lib/upload-rules";
import { isActive, parseReading, readingProblem, type Meter, type MeterResource } from "./meter";
import { nextYearNumber } from "@/shared/lib/numbering";

/** Statuses of a reading, in the words of the specification (7.9). */
export const readingStatuses = [
  "draft",
  "sent",
  "registered",
  "awaiting_check",
  "accepted",
  "rejected",
  "clarification_required",
  "passed_to_system",
  "processed",
] as const;
export type ReadingStatus = (typeof readingStatuses)[number];

export type ReadingActor = "applicant" | "provider";
export type ReadingHistoryEntry = {
  status: ReadingStatus;
  at: string;
  actor: ReadingActor;
  note?: string;
};

export type Reading = {
  id: string;
  ownerId: string;
  meterId: string;
  propertyId: string;
  number: string;
  value: number;
  /** The day the reading was taken (ISO date), not the day it was sent. */
  readingDate: string;
  /** Only the name and size are kept in the browser (spec 7.3). */
  photo?: StoredFile;
  previousValue: number;
  previousDate: string;
  status: ReadingStatus;
  history: ReadingHistoryEntry[];
  /** The provider's remark when the reading was rejected or needs clarifying (spec 7.13). */
  providerNote?: string;
  submittedAt: string;
};

export const NUMBER_PATTERN = /^DEMO-POK-\d{4}-\d{5}$/;
export const MAX_READINGS = 300;
export const MAX_NOTE = 400;
/** A reading older than this is not taken: the period for sending (spec 7.5). */
export const MAX_AGE_DAYS = 45;

/** Providers that ask for a photo of the meter (spec 7.5, last item). Set by the provider later. */
export const PHOTO_REQUIRED: Record<MeterResource, boolean> = {
  electricity: true,
  cold_water: false,
  hot_water: false,
  heat: false,
  gas: true,
};

export type ReadingDraft = {
  valueText: string;
  readingDate: string;
  photo?: StoredFile;
  /** "I confirm the data is true" (spec 7.1). */
  authentic: boolean;
  /** The person saw that the reading went down and sent it for a check anyway (spec 7.7). */
  decreaseConfirmed: boolean;
};

export type ReadingErrors = {
  meter?: "inactive";
  value?: "required" | "negative" | "format" | "digits" | "decimals" | "duplicate";
  date?: "required" | "format" | "future" | "old" | "beforePrevious";
  photo?: "required" | "type" | "size" | "empty";
  authentic?: "required";
  /** Not a mistake in the text: the reading is lower than the previous one and needs a decision. */
  decrease?: "confirm";
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const isCounted = (reading: Pick<Reading, "status">) =>
  reading.status !== "draft" && reading.status !== "rejected";

const byNewest = (a: Reading, b: Reading) =>
  b.readingDate.localeCompare(a.readingDate) || b.submittedAt.localeCompare(a.submittedAt);

/** Readings of one meter, newest first (spec 7.13). */
export function readingsOf(meterId: string, readings: readonly Reading[]): Reading[] {
  return readings.filter((item) => item.meterId === meterId).sort(byNewest);
}

/**
 * The reading to compare with: the newest one that was not rejected, even if the provider has not
 * looked at it yet. Without any, the first reading from the day the meter was added.
 */
export function previousOf(
  meter: Pick<Meter, "id" | "initialReading" | "installedAt">,
  readings: readonly Reading[],
): { value: number; date: string } {
  const latest = readingsOf(meter.id, readings).find(isCounted);
  if (latest) return { value: latest.value, date: latest.readingDate };
  return { value: meter.initialReading, date: meter.installedAt };
}

/** The newest reading of any status: what the card of the meter shows as "check status" (spec 6.3). */
export function newestReading(meterId: string, readings: readonly Reading[]): Reading | undefined {
  return readings
    .filter((item) => item.meterId === meterId && item.status !== "draft")
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
}

/** Why a photo cannot be taken, or null. Only pictures are taken for a meter, not PDF files. */
export function photoProblem(file: StoredFile): "type" | "size" | "empty" | null {
  if (file.name.toLowerCase().endsWith(".pdf")) return "type";
  return checkFile(file);
}

/** All the checks before sending (spec 7.5), each with its own code so the form can explain it. */
export function checkReading(
  meter: Meter,
  readings: readonly Reading[],
  draft: ReadingDraft,
  today: Date,
): ReadingErrors {
  const errors: ReadingErrors = {};
  if (!isActive(meter)) errors.meter = "inactive";

  const previous = previousOf(meter, readings);
  const problem = readingProblem(draft.valueText, meter);
  const value = parseReading(draft.valueText);
  if (problem) errors.value = problem;

  const todayText = today.toISOString().slice(0, 10);
  if (!draft.readingDate) errors.date = "required";
  else if (!ISO_DATE.test(draft.readingDate) || Number.isNaN(Date.parse(draft.readingDate))) {
    errors.date = "format";
  } else if (draft.readingDate > todayText) errors.date = "future";
  else if (
    (Date.parse(`${todayText}T00:00:00Z`) - Date.parse(`${draft.readingDate}T00:00:00Z`)) / DAY_MS >
    MAX_AGE_DAYS
  ) {
    errors.date = "old";
  } else if (draft.readingDate < previous.date) errors.date = "beforePrevious";

  if (value !== null && !errors.value) {
    const same = readings.some(
      (item) =>
        item.meterId === meter.id &&
        isCounted(item) &&
        item.value === value &&
        item.readingDate === draft.readingDate,
    );
    if (same) errors.value = "duplicate";
    else if (value < previous.value && !draft.decreaseConfirmed) errors.decrease = "confirm";
  }

  if (draft.photo) {
    const photo = photoProblem(draft.photo);
    if (photo) errors.photo = photo;
  } else if (PHOTO_REQUIRED[meter.resource]) {
    errors.photo = "required";
  }
  if (!draft.authentic) errors.authentic = "required";
  return errors;
}

export const hasErrors = (errors: ReadingErrors): boolean => Object.keys(errors).length > 0;

/** Next free number of the year: DEMO-POK-2026-00001, ... */
export function nextReadingNumber(existing: readonly { number: string }[], now: Date): string {
  return nextYearNumber(
    "DEMO-POK",
    existing.map((item) => item.number),
    now,
  );
}

export type SubmitResult = { ok: true; reading: Reading } | { ok: false; errors: ReadingErrors };

/**
 * Sends a reading (spec 7.8). It gets a number and is registered; a reading lower than the
 * previous one waits for the provider's check (7.7). It is not counted for the bill until the
 * provider has processed it (7.12).
 */
export function submitReading(
  meter: Meter,
  readings: readonly Reading[],
  draft: ReadingDraft,
  context: { id: string; ownerId: string },
  now: Date,
): SubmitResult {
  const errors = checkReading(meter, readings, draft, now);
  const value = parseReading(draft.valueText);
  if (hasErrors(errors) || value === null) return { ok: false, errors };

  const previous = previousOf(meter, readings);
  const at = now.toISOString();
  const lowered = value < previous.value;
  const history: ReadingHistoryEntry[] = [
    { status: "sent", at, actor: "applicant" },
    { status: "registered", at, actor: "provider" },
    ...(lowered ? [{ status: "awaiting_check" as const, at, actor: "provider" as const }] : []),
  ];
  return {
    ok: true,
    reading: {
      id: context.id,
      ownerId: context.ownerId,
      meterId: meter.id,
      propertyId: meter.propertyId,
      number: nextReadingNumber(readings, now),
      value,
      readingDate: draft.readingDate,
      ...(draft.photo ? { photo: { name: draft.photo.name, size: draft.photo.size } } : {}),
      previousValue: previous.value,
      previousDate: previous.date,
      status: lowered ? "awaiting_check" : "registered",
      history,
      submittedAt: at,
    },
  };
}

const PROVIDER_MOVES: Partial<Record<ReadingStatus, readonly ReadingStatus[]>> = {
  registered: ["awaiting_check", "accepted", "rejected", "clarification_required"],
  awaiting_check: ["accepted", "rejected", "clarification_required"],
  clarification_required: ["accepted", "rejected"],
  accepted: ["passed_to_system"],
  passed_to_system: ["processed"],
};

/** What the provider may do with a reading in this status (demo; the real provider has a cabinet). */
export function readingProviderOptions(status: ReadingStatus): readonly ReadingStatus[] {
  return PROVIDER_MOVES[status] ?? [];
}

export type ReadingChange =
  { ok: true; reading: Reading } | { ok: false; reason: "not_allowed" | "note_required" };

/** A rejection or a request for clarification needs a reason the person can read (spec 7.13). */
export function readingProviderChange(
  reading: Reading,
  to: ReadingStatus,
  now: Date,
  note?: string,
): ReadingChange {
  if (!readingProviderOptions(reading.status).includes(to)) {
    return { ok: false, reason: "not_allowed" };
  }
  const text = note?.trim();
  if ((to === "rejected" || to === "clarification_required") && !text) {
    return { ok: false, reason: "note_required" };
  }
  return {
    ok: true,
    reading: {
      ...reading,
      status: to,
      ...(text ? { providerNote: text.slice(0, MAX_NOTE) } : {}),
      history: [
        ...reading.history,
        {
          status: to,
          at: now.toISOString(),
          actor: "provider",
          ...(text ? { note: text.slice(0, MAX_NOTE) } : {}),
        },
      ],
    },
  };
}

export type ReadingStage = "waiting" | "check" | "accepted" | "counted" | "problem";

/** What the person should understand from the status: sent is not yet counted (spec 7.12). */
export function readingStage(status: ReadingStatus): ReadingStage {
  switch (status) {
    case "awaiting_check":
      return "check";
    case "accepted":
    case "passed_to_system":
      return "accepted";
    case "processed":
      return "counted";
    case "rejected":
    case "clarification_required":
      return "problem";
    default:
      return "waiting";
  }
}

/** A reading the demo can fake from a photo (spec 7.4): the previous value plus a small step. */
export function demoRecognized(previous: number, decimals: number): string {
  const value = previous + 12.5;
  return value.toFixed(decimals).replace(".", decimals > 0 ? "," : "");
}
