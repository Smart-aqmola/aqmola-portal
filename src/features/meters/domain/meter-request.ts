import type { StoredFile } from "@/features/account/domain/property";
import { normalizePhone } from "@/features/account/domain/phone";
import { MAX_FILES, checkFile } from "@/shared/lib/upload-rules";
import { parseReading, readingProblem, withEvent, type Meter, type MeterResource } from "./meter";

/** The five services for meters of the specification (8.2–8.6) and a report of a fault (6.2). */
export const requestKinds = [
  "installation",
  "replacement",
  "sealing",
  "unseal",
  "verification",
  "fault",
] as const;
export type RequestKind = (typeof requestKinds)[number];

export const requestStatuses = [
  "registered",
  "in_progress",
  "info_requested",
  "scheduled",
  "done",
  "rejected",
] as const;
export type RequestStatus = (typeof requestStatuses)[number];

export const timeSlots = ["morning", "day", "evening"] as const;
export type TimeSlot = (typeof timeSlots)[number];
export type Slot = { date: string; time: TimeSlot };

export type RequestHistoryEntry = {
  status: RequestStatus;
  at: string;
  actor: "applicant" | "provider";
  note?: string;
};

/** What the specialist writes down when the work is done (spec 8.8). */
export type RequestResult = {
  newSerial?: string;
  reading?: string;
  seal?: string;
  nextVerification?: string;
  /** ISO date of the work. */
  at: string;
};

export type MeterRequest = {
  id: string;
  ownerId: string;
  propertyId: string;
  address: string;
  number: string;
  kind: RequestKind;
  resource: MeterResource;
  meterId?: string;
  reason: string;
  details: Record<string, string>;
  currentReading: string;
  contactPhone: string;
  slots: Slot[];
  comment: string;
  attachments: StoredFile[];
  status: RequestStatus;
  history: RequestHistoryEntry[];
  scheduled?: Slot;
  assignee?: string;
  /** The provider's remark: why it was rejected or what it asks to clarify. */
  remarks?: string;
  result?: RequestResult;
  createdAt: string;
  updatedAt: string;
};

export const NUMBER_PATTERN = /^DEMO-ZPR-\d{4}-\d{5}$/;
export const MAX_REQUESTS = 80;
export const MAX_SLOTS = 3;
export const MAX_COMMENT = 500;
export const MAX_DETAIL = 300;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** How far ahead a visit may be asked for. */
export const MAX_DAYS_AHEAD = 60;

export type DetailKey =
  | "newMeter"
  | "faultInfo"
  | "previousSeal"
  | "installedAt"
  | "plannedWork"
  | "lastVerifiedAt"
  | "nextVerificationAt";
type DetailSpec = { key: DetailKey; required: boolean; date: boolean };

type Presence = "none" | "optional" | "required";

/** What each form asks for (spec 8.2–8.6). The common fields are the same for every service. */
export const requestForms: Record<
  RequestKind,
  {
    meter: Presence;
    reading: Presence;
    reasons: readonly string[];
    details: readonly DetailSpec[];
    /** The result fields the specialist must fill in to close the request (spec 8.8). */
    result: readonly ("newSerial" | "reading" | "seal" | "nextVerification")[];
    mustFill: readonly ("newSerial" | "reading" | "seal")[];
  }
> = {
  installation: {
    meter: "optional",
    reading: "none",
    reasons: ["no_meter", "new_building", "upgrade", "required", "other"],
    details: [{ key: "newMeter", required: false, date: false }],
    result: ["newSerial", "reading"],
    mustFill: ["newSerial", "reading"],
  },
  replacement: {
    meter: "required",
    reading: "required",
    reasons: ["broken", "expired", "damaged", "upgrade", "other"],
    details: [
      { key: "faultInfo", required: true, date: false },
      { key: "newMeter", required: false, date: false },
    ],
    result: ["newSerial", "reading"],
    mustFill: ["newSerial", "reading"],
  },
  sealing: {
    meter: "required",
    reading: "none",
    reasons: ["new_meter", "seal_broken", "after_verification", "other"],
    details: [
      { key: "installedAt", required: true, date: true },
      { key: "previousSeal", required: false, date: false },
    ],
    result: ["seal"],
    mustFill: ["seal"],
  },
  unseal: {
    meter: "required",
    reading: "required",
    reasons: ["repair", "replacement", "verification", "other"],
    details: [{ key: "plannedWork", required: true, date: false }],
    result: [],
    mustFill: [],
  },
  verification: {
    meter: "required",
    reading: "optional",
    reasons: ["scheduled", "expired", "dispute", "other"],
    details: [
      { key: "lastVerifiedAt", required: false, date: true },
      { key: "nextVerificationAt", required: false, date: true },
    ],
    result: ["nextVerification"],
    mustFill: [],
  },
  fault: {
    meter: "required",
    reading: "none",
    reasons: ["no_display", "wrong_count", "damaged", "leak", "other"],
    details: [{ key: "faultInfo", required: true, date: false }],
    result: [],
    mustFill: [],
  },
};

export const isRequestKind = (value: unknown): value is RequestKind =>
  typeof value === "string" && (requestKinds as readonly string[]).includes(value);

export type RequestInput = {
  kind: RequestKind;
  propertyId: string;
  resource: MeterResource | "";
  meterId: string;
  reason: string;
  details: Record<string, string>;
  currentReading: string;
  contactPhone: string;
  slots: Slot[];
  comment: string;
  attachments: StoredFile[];
};

export type RequestErrors = {
  propertyId?: "required";
  resource?: "required";
  meterId?: "required";
  reason?: "required";
  details?: Partial<Record<DetailKey, "required" | "long" | "format" | "future" | "order">>;
  currentReading?: "required" | "negative" | "format" | "digits" | "decimals";
  contactPhone?: "required" | "format";
  slots?: "required" | "past" | "far" | "format" | "same";
  comment?: "long";
  attachments?: "many" | "type" | "size" | "empty";
};

export const emptyRequestInput = (kind: RequestKind, contactPhone = ""): RequestInput => ({
  kind,
  propertyId: "",
  resource: "",
  meterId: "",
  reason: "",
  details: {},
  currentReading: "",
  contactPhone,
  slots: [{ date: "", time: "morning" }],
  comment: "",
  attachments: [],
});

function checkSlots(slots: readonly Slot[], today: Date): RequestErrors["slots"] {
  const filled = slots.filter((slot) => slot.date);
  if (filled.length === 0) return "required";
  const todayText = today.toISOString().slice(0, 10);
  const limit = new Date(today.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const seen = new Set<string>();
  for (const slot of filled) {
    if (!ISO_DATE.test(slot.date) || Number.isNaN(Date.parse(slot.date))) return "format";
    if (slot.date < todayText) return "past";
    if (slot.date > limit) return "far";
    const key = `${slot.date}/${slot.time}`;
    if (seen.has(key)) return "same";
    seen.add(key);
  }
  return undefined;
}

/** Checks a request for work on a meter before it is sent (spec 8.2–8.6). */
export function validateRequest(
  input: RequestInput,
  today: Date,
  meter?: Pick<Meter, "digits" | "decimals">,
): RequestErrors {
  const form = requestForms[input.kind];
  const errors: RequestErrors = {};
  if (!input.propertyId) errors.propertyId = "required";
  if (!input.resource) errors.resource = "required";
  if (form.meter === "required" && !input.meterId) errors.meterId = "required";
  if (!input.reason) errors.reason = "required";

  const details: NonNullable<RequestErrors["details"]> = {};
  for (const spec of form.details) {
    const value = (input.details[spec.key] ?? "").trim();
    if (!value) {
      if (spec.required) details[spec.key] = "required";
    } else if (spec.date) {
      if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) details[spec.key] = "format";
      else if (spec.key !== "nextVerificationAt" && value > today.toISOString().slice(0, 10)) {
        details[spec.key] = "future";
      }
    } else if (value.length > MAX_DETAIL) details[spec.key] = "long";
  }
  const last = input.details.lastVerifiedAt?.trim();
  const next = input.details.nextVerificationAt?.trim();
  if (!details.nextVerificationAt && last && next && next <= last) {
    details.nextVerificationAt = "order";
  }
  if (Object.keys(details).length > 0) errors.details = details;

  if (form.reading !== "none") {
    const text = input.currentReading.trim();
    if (text || form.reading === "required") {
      const problem = readingProblem(text, meter ?? { digits: 8, decimals: 3 });
      if (problem) errors.currentReading = problem;
    }
  }

  if (!input.contactPhone.trim()) errors.contactPhone = "required";
  else if (!normalizePhone(input.contactPhone)) errors.contactPhone = "format";

  const slots = checkSlots(input.slots.slice(0, MAX_SLOTS), today);
  if (slots) errors.slots = slots;
  if (input.comment.length > MAX_COMMENT) errors.comment = "long";

  if (input.attachments.length > MAX_FILES) errors.attachments = "many";
  else {
    for (const file of input.attachments) {
      const problem = checkFile(file);
      if (problem) {
        errors.attachments = problem;
        break;
      }
    }
  }
  return errors;
}

export const requestHasErrors = (errors: RequestErrors): boolean => Object.keys(errors).length > 0;

/** Next free number of the year: DEMO-ZPR-2026-00001, ... */
export function nextRequestNumber(existing: readonly { number: string }[], now: Date): string {
  const prefix = `DEMO-ZPR-${now.getUTCFullYear()}-`;
  const highest = existing.reduce((max, item) => {
    if (!item.number.startsWith(prefix)) return max;
    return Math.max(max, Number(item.number.slice(prefix.length)));
  }, 0);
  return `${prefix}${String(highest + 1).padStart(5, "0")}`;
}

/** Builds the request from a form that passed `validateRequest`. It is registered at once (spec 8.9). */
export function createRequest(
  input: RequestInput,
  context: { id: string; ownerId: string; address: string },
  existing: readonly { number: string }[],
  now: Date,
): MeterRequest {
  if (!input.resource) throw new Error("A request needs a resource");
  const at = now.toISOString();
  const details: Record<string, string> = {};
  for (const spec of requestForms[input.kind].details) {
    const value = (input.details[spec.key] ?? "").trim();
    if (value) details[spec.key] = value;
  }
  return {
    id: context.id,
    ownerId: context.ownerId,
    propertyId: input.propertyId,
    address: context.address,
    number: nextRequestNumber(existing, now),
    kind: input.kind,
    resource: input.resource,
    ...(input.meterId ? { meterId: input.meterId } : {}),
    reason: input.reason,
    details,
    currentReading: input.currentReading.trim(),
    contactPhone: normalizePhone(input.contactPhone) ?? input.contactPhone.trim(),
    slots: input.slots
      .filter((slot) => slot.date)
      .slice(0, MAX_SLOTS)
      .map((slot) => ({ date: slot.date, time: slot.time })),
    comment: input.comment.trim(),
    attachments: input.attachments.map((file) => ({ name: file.name, size: file.size })),
    status: "registered",
    history: [{ status: "registered", at, actor: "provider" }],
    createdAt: at,
    updatedAt: at,
  };
}

const MOVES: Partial<Record<RequestStatus, readonly RequestStatus[]>> = {
  registered: ["in_progress", "info_requested", "rejected"],
  in_progress: ["scheduled", "info_requested", "rejected"],
  info_requested: ["in_progress", "rejected"],
  scheduled: ["scheduled", "done", "rejected"],
};

/** What the provider may do in this status (demo; the real provider has its own cabinet, 12.x). */
export function requestProviderOptions(status: RequestStatus): readonly RequestStatus[] {
  return MOVES[status] ?? [];
}

export const isRequestFinal = (status: RequestStatus): boolean =>
  status === "done" || status === "rejected";

export type ProviderStep = {
  note?: string;
  slot?: Slot;
  assignee?: string;
  result?: RequestResult;
};

export type RequestChange =
  | { ok: true; request: MeterRequest }
  | {
      ok: false;
      reason: "not_allowed" | "note_required" | "slot_required" | "result_required";
    };

/** Moves a request one step for the provider, checking what each step needs (spec 8.8). */
export function requestProviderChange(
  request: MeterRequest,
  to: RequestStatus,
  now: Date,
  step: ProviderStep = {},
): RequestChange {
  if (!requestProviderOptions(request.status).includes(to)) {
    return { ok: false, reason: "not_allowed" };
  }
  const note = step.note?.trim().slice(0, MAX_COMMENT);
  if ((to === "rejected" || to === "info_requested") && !note) {
    return { ok: false, reason: "note_required" };
  }
  if (to === "scheduled") {
    if (!step.slot?.date || !step.assignee?.trim()) return { ok: false, reason: "slot_required" };
    const moved =
      request.status === "scheduled" &&
      (request.scheduled?.date !== step.slot.date || request.scheduled?.time !== step.slot.time);
    // Changing a date that was already given needs a reason (spec 8.8).
    if (moved && !note) return { ok: false, reason: "note_required" };
  }
  if (to === "done") {
    const result = step.result;
    const missing = requestForms[request.kind].mustFill.some((key) => {
      const value = result?.[key]?.trim();
      return !value || (key === "reading" && parseReading(value) === null);
    });
    if (!result || missing) return { ok: false, reason: "result_required" };
  }
  const at = now.toISOString();
  return {
    ok: true,
    request: {
      ...request,
      status: to,
      updatedAt: at,
      ...(note ? { remarks: note } : {}),
      ...(to === "scheduled" && step.slot
        ? {
            scheduled: { date: step.slot.date, time: step.slot.time },
            assignee: step.assignee?.trim(),
          }
        : {}),
      ...(to === "done" && step.result ? { result: step.result } : {}),
      history: [
        ...request.history,
        { status: to, at, actor: "provider", ...(note ? { note } : {}) },
      ],
    },
  };
}

/**
 * What closing the request does to the meters of the person (spec 8.11): a new meter appears, an
 * old one is marked replaced, a seal is put on or taken off, the verification date moves.
 */
export function completeRequest(
  request: MeterRequest,
  meters: readonly Meter[],
  newMeterId: string,
  now: Date,
): { updated: Meter[]; created: Meter[] } {
  const result = request.result;
  if (request.status !== "done" || !result) return { updated: [], created: [] };
  const day = result.at;
  const old = meters.find((item) => item.id === request.meterId);
  const fresh = (from?: Meter): Meter => ({
    id: newMeterId,
    ownerId: request.ownerId,
    propertyId: request.propertyId,
    address: request.address,
    resource: request.resource,
    type: from?.type ?? "electronic",
    manufacturer: "",
    model: "",
    serial: result.newSerial?.trim() ?? "",
    personalAccount: from?.personalAccount ?? "",
    installedAt: day,
    commissionedAt: day,
    lastVerifiedAt: day,
    nextVerificationAt: result.nextVerification ?? "",
    sealNumber: "",
    sealedAt: "",
    state: "working",
    digits: from?.digits ?? 5,
    decimals: from?.decimals ?? 0,
    initialReading: parseReading(result.reading ?? "") ?? 0,
    history: [{ kind: "installed", at: day }],
    createdAt: now.toISOString(),
  });

  switch (request.kind) {
    case "installation":
      return { updated: [], created: [fresh()] };
    case "replacement":
      return {
        updated: old
          ? [
              withEvent(
                { ...old, state: "replaced", sealNumber: "", sealedAt: "" },
                { kind: "replaced", at: day, note: result.newSerial?.trim() },
              ),
            ]
          : [],
        created: [fresh(old)],
      };
    case "sealing":
      return {
        updated: old
          ? [
              withEvent(
                { ...old, sealNumber: result.seal?.trim() ?? "", sealedAt: day },
                { kind: "sealed", at: day, note: result.seal?.trim() },
              ),
            ]
          : [],
        created: [],
      };
    case "unseal":
      return {
        updated: old
          ? [withEvent({ ...old, sealNumber: "", sealedAt: "" }, { kind: "unsealed", at: day })]
          : [],
        created: [],
      };
    case "verification":
      return {
        updated: old
          ? [
              withEvent(
                { ...old, lastVerifiedAt: day, nextVerificationAt: result.nextVerification ?? "" },
                { kind: "verified", at: day },
              ),
            ]
          : [],
        created: [],
      };
    case "fault":
      return {
        updated: old ? [withEvent({ ...old, state: "faulty" }, { kind: "fault", at: day })] : [],
        created: [],
      };
  }
}
