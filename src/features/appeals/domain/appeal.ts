import type { ContractSector, ProviderInfo } from "@/features/account/domain/availability";
import { normalizePhone } from "@/features/account/domain/phone";
import type { StoredFile } from "@/features/account/domain/property";
import { connectedProviders } from "@/features/billing/domain/connected";
import type { Sector } from "@/features/catalog/domain/types";
import { MAX_FILES, checkFile } from "@/shared/lib/upload-rules";
import { nextYearNumber } from "@/shared/lib/numbering";

/** The subjects of an appeal, in the order of the specification (11.1). */
export const appealCategories = [
  "no_service",
  "power_cut",
  "water_cut",
  "no_heat",
  "gas_problem",
  "waste_late",
  "quality",
  "wrong_charges",
  "wrong_readings",
  "late_payment",
  "contract_refused",
  "late_request",
  "other",
] as const;
export type AppealCategory = (typeof appealCategories)[number];

/** What a category splits into (spec 11.2). The first one is the default. */
export const subcategories: Record<AppealCategory, readonly string[]> = {
  no_service: ["electricity", "water", "heat", "gas", "waste"],
  power_cut: ["long_outage", "unannounced", "voltage", "emergency"],
  water_cut: ["no_water", "low_pressure", "no_hot_water", "emergency"],
  no_heat: ["cold_radiators", "whole_building", "uneven"],
  gas_problem: ["no_gas", "low_pressure", "smell", "meter"],
  waste_late: ["not_collected", "no_containers", "dirty_site"],
  quality: ["water_quality", "heat_temperature", "electric_quality", "gas_quality"],
  wrong_charges: ["wrong_amount", "not_my_account", "double_charge", "recalc_refused"],
  wrong_readings: ["not_applied", "wrongly_applied", "rejected_reading"],
  late_payment: ["not_credited", "wrong_account"],
  contract_refused: ["no_reason", "too_long"],
  late_request: ["contract_request", "meter_request", "other_request"],
  other: ["other"],
};

/** The utility an appeal is about, when the category or the subcategory says it. */
export function impliedSector(
  category: AppealCategory,
  subcategory: string,
): ContractSector | undefined {
  switch (category) {
    case "power_cut":
      return "electricity";
    case "water_cut":
      return "water";
    case "no_heat":
      return "heat";
    case "gas_problem":
      return "gas";
    case "waste_late":
      return "waste";
    case "no_service":
      return subcategory as ContractSector;
    case "quality":
      return (
        {
          water_quality: "water",
          heat_temperature: "heat",
          electric_quality: "electricity",
          gas_quality: "gas",
        } as const
      )[subcategory as "water_quality"];
    default:
      return undefined;
  }
}

/** Categories where the person may say when and for how long the service was bad (spec 11.3). */
export const WITH_VIOLATION: readonly AppealCategory[] = [
  "no_service",
  "power_cut",
  "water_cut",
  "no_heat",
  "gas_problem",
  "waste_late",
  "quality",
];

/** Statuses of an appeal, in the words of the specification (11.7). */
export const appealStatuses = [
  "registered",
  "sent_to_executor",
  "accepted",
  "info_required",
  "in_review",
  "answer_ready",
  "executed",
  "closed",
  "redirected",
  "refused",
] as const;
export type AppealStatus = (typeof appealStatuses)[number];

export type AppealActor = "applicant" | "executor";
/** One line of the history of the dealings: a change of status, a message, or both (spec 11.8). */
export type AppealEvent = {
  at: string;
  actor: AppealActor;
  status?: AppealStatus;
  text?: string;
};

export type Violation = { date: string; time: string; duration: string; unit: "hours" | "days" };

export type Appeal = {
  id: string;
  ownerId: string;
  /** `DEMO-OBR-ГГГГ-NNNNN`. */
  number: string;
  category: AppealCategory;
  subcategory: string;
  sector?: ContractSector;
  propertyId?: string;
  address: string;
  description: string;
  contactPhone: string;
  contactEmail: string;
  attachments: StoredFile[];
  violation?: Violation;
  /** The organization that deals with it (spec 11.4). */
  organizationId: string;
  organizationName: string;
  /** Registration in the system of electronic appeals, when the appeal goes there (spec 11.6). */
  external?: { number: string };
  status: AppealStatus;
  events: AppealEvent[];
  createdAt: string;
  updatedAt: string;
};

export const NUMBER_PATTERN = /^DEMO-OBR-\d{4}-\d{5}$/;
export const EXTERNAL_PATTERN = /^ЭО-\d{4}-\d{5}$/;
export const MAX_APPEALS = 60;
export const MAX_DESCRIPTION = 1000;
export const MIN_DESCRIPTION = 10;
export const MAX_MESSAGE = 500;
export const MAX_ADDRESS = 200;
export const MAX_EVENTS = 80;

/** The body that deals with what no utility owns, and with whatever a utility sends on (spec 11.4). */
export const REGION_OFFICE = { id: "region-office", sector: "region" } as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AppealInput = {
  category: AppealCategory | "";
  subcategory: string;
  /** The utility, when the category does not say it. */
  sector: ContractSector | "";
  propertyId: string;
  address: string;
  description: string;
  contactPhone: string;
  contactEmail: string;
  attachments: StoredFile[];
  violationDate: string;
  violationTime: string;
  duration: string;
  unit: "hours" | "days";
};

export const emptyAppealInput = (contactPhone = "", contactEmail = ""): AppealInput => ({
  category: "",
  subcategory: "",
  sector: "",
  propertyId: "",
  address: "",
  description: "",
  contactPhone,
  contactEmail,
  attachments: [],
  violationDate: "",
  violationTime: "",
  duration: "",
  unit: "hours",
});

export type AppealErrors = {
  category?: "required";
  subcategory?: "required";
  sector?: "required";
  address?: "required" | "short" | "long";
  description?: "required" | "short" | "long";
  contactPhone?: "required" | "format";
  contactEmail?: "format";
  attachments?: "many" | "type" | "size" | "empty";
  violationDate?: "required" | "format" | "future";
  violationTime?: "format";
  duration?: "format";
};

/** The utility to use for an appeal: the one the category says, or the one the person chose. */
export function sectorOf(input: Pick<AppealInput, "category" | "subcategory" | "sector">) {
  if (!input.category) return undefined;
  return impliedSector(input.category, input.subcategory) ?? (input.sector || undefined);
}

/** Categories where the person must say which utility it is about; for "other" it is optional. */
const SECTOR_REQUIRED: readonly AppealCategory[] = [
  "wrong_charges",
  "wrong_readings",
  "late_payment",
  "contract_refused",
  "late_request",
];

export function needsSector(category: AppealCategory | ""): boolean {
  return category !== "" && SECTOR_REQUIRED.includes(category);
}

/** Categories where the utility can be chosen by the person (required for some, optional for "other"). */
export function asksSector(category: AppealCategory | ""): boolean {
  return needsSector(category) || category === "other";
}

/** Checks the form of an appeal (spec 11.2, 11.3). */
export function validateAppeal(input: AppealInput, today: Date): AppealErrors {
  const errors: AppealErrors = {};
  if (!input.category) errors.category = "required";
  else if (!subcategories[input.category].includes(input.subcategory)) {
    errors.subcategory = "required";
  } else if (needsSector(input.category) && !input.sector) errors.sector = "required";

  const address = input.address.trim();
  if (!address) errors.address = "required";
  else if (address.length < 3) errors.address = "short";
  else if (address.length > MAX_ADDRESS) errors.address = "long";

  const description = input.description.trim();
  if (!description) errors.description = "required";
  else if (description.length < MIN_DESCRIPTION) errors.description = "short";
  else if (description.length > MAX_DESCRIPTION) errors.description = "long";

  if (!input.contactPhone.trim()) errors.contactPhone = "required";
  else if (!normalizePhone(input.contactPhone)) errors.contactPhone = "format";
  if (input.contactEmail.trim() && !EMAIL.test(input.contactEmail.trim())) {
    errors.contactEmail = "format";
  }

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

  const asked = input.category !== "" && WITH_VIOLATION.includes(input.category);
  if (asked) {
    const todayText = today.toISOString().slice(0, 10);
    const given = input.violationDate || input.violationTime.trim() || input.duration.trim();
    if (given && !input.violationDate) errors.violationDate = "required";
    else if (input.violationDate) {
      if (!ISO_DATE.test(input.violationDate) || Number.isNaN(Date.parse(input.violationDate))) {
        errors.violationDate = "format";
      } else if (input.violationDate > todayText) errors.violationDate = "future";
    }
    if (input.violationTime.trim() && !TIME.test(input.violationTime.trim())) {
      errors.violationTime = "format";
    }
    const duration = input.duration.trim();
    if (duration && !(/^\d{1,3}$/.test(duration) && Number(duration) > 0)) {
      errors.duration = "format";
    }
  }
  return errors;
}

export const appealHasErrors = (errors: AppealErrors): boolean => Object.keys(errors).length > 0;

/** Where the appeal goes (spec 11.4): the provider of the utility at the address, else the region office. */
export function responsibleOrganization(
  sector: ContractSector | undefined,
  place: { territoryId: string; without: readonly Sector[] } | undefined,
  providers: readonly ProviderInfo[],
  regionOfficeName: string,
): { id: string; name: string } {
  if (sector && place) {
    const found = connectedProviders(place, providers).find((item) => item.sector === sector);
    if (found) return { id: found.id, name: found.name };
  }
  return { id: REGION_OFFICE.id, name: regionOfficeName };
}

/** Next free number of the year: DEMO-OBR-2026-00001, ... */
export function nextAppealNumber(existing: readonly { number: string }[], now: Date): string {
  return nextYearNumber(
    "DEMO-OBR",
    existing.map((item) => item.number),
    now,
  );
}

/** The number in the system of electronic appeals (demo): the same count, another prefix. */
export function externalNumber(
  existing: readonly { external?: { number: string } }[],
  now: Date,
): string {
  return nextYearNumber(
    "ЭО",
    existing.map((item) => item.external?.number),
    now,
  );
}

/**
 * Registers the appeal and sends it to the executor at once (spec 11.5): it gets a number and the
 * history starts with both steps. An appeal for the region office is also entered into the system
 * of electronic appeals (11.6).
 */
export function createAppeal(
  input: AppealInput,
  context: {
    id: string;
    ownerId: string;
    organization: { id: string; name: string };
  },
  existing: readonly Pick<Appeal, "number" | "external">[],
  now: Date,
): Appeal {
  if (!input.category) throw new Error("An appeal needs a category");
  const at = now.toISOString();
  const sector = sectorOf(input);
  const violationGiven = WITH_VIOLATION.includes(input.category) && input.violationDate;
  return {
    id: context.id,
    ownerId: context.ownerId,
    number: nextAppealNumber(existing, now),
    category: input.category,
    subcategory: input.subcategory,
    ...(sector ? { sector } : {}),
    ...(input.propertyId ? { propertyId: input.propertyId } : {}),
    address: input.address.trim(),
    description: input.description.trim(),
    contactPhone: normalizePhone(input.contactPhone) ?? input.contactPhone.trim(),
    contactEmail: input.contactEmail.trim(),
    attachments: input.attachments.map((file) => ({ name: file.name, size: file.size })),
    ...(violationGiven
      ? {
          violation: {
            date: input.violationDate,
            time: input.violationTime.trim(),
            duration: input.duration.trim(),
            unit: input.unit,
          },
        }
      : {}),
    organizationId: context.organization.id,
    organizationName: context.organization.name,
    ...(context.organization.id === REGION_OFFICE.id
      ? { external: { number: externalNumber(existing, now) } }
      : {}),
    status: "sent_to_executor",
    events: [
      { at, actor: "executor", status: "registered" },
      { at, actor: "executor", status: "sent_to_executor" },
    ],
    createdAt: at,
    updatedAt: at,
  };
}

export const isClosedAppeal = (status: AppealStatus): boolean =>
  status === "executed" || status === "closed" || status === "refused";

/** The executor has asked something and waits for the person (spec 10.5). */
export const awaitsApplicant = (appeal: Pick<Appeal, "status">): boolean =>
  appeal.status === "info_required";

const EXECUTOR_MOVES: Partial<Record<AppealStatus, readonly AppealStatus[]>> = {
  sent_to_executor: ["accepted", "refused", "redirected"],
  accepted: ["in_review", "info_required", "refused", "redirected"],
  in_review: ["answer_ready", "info_required", "refused", "redirected"],
  info_required: ["refused"],
  answer_ready: ["executed", "in_review"],
  executed: ["closed"],
  redirected: ["accepted", "refused"],
};

/** What the executor may do in this status (demo; the real executor has a cabinet, spec 12). */
export function executorOptions(status: AppealStatus): readonly AppealStatus[] {
  return EXECUTOR_MOVES[status] ?? [];
}

/** These steps need words for the person: a question, an answer, a reason, a new address. */
export const NEEDS_TEXT: readonly AppealStatus[] = [
  "info_required",
  "answer_ready",
  "refused",
  "redirected",
];

export type AppealChange =
  { ok: true; appeal: Appeal } | { ok: false; reason: "not_allowed" | "text_required" | "closed" };

function withEvent(appeal: Appeal, event: AppealEvent, patch: Partial<Appeal> = {}): Appeal {
  return {
    ...appeal,
    ...patch,
    updatedAt: event.at,
    events: [...appeal.events, event].slice(-MAX_EVENTS),
  };
}

/** The executor moves the appeal on. A question, an answer, a refusal or a redirect needs text (11.7). */
export function executorStep(
  appeal: Appeal,
  to: AppealStatus,
  text: string,
  now: Date,
  redirectTo?: { id: string; name: string },
): AppealChange {
  if (!executorOptions(appeal.status).includes(to)) return { ok: false, reason: "not_allowed" };
  const clean = text.trim().slice(0, MAX_MESSAGE);
  if (NEEDS_TEXT.includes(to) && !clean) return { ok: false, reason: "text_required" };
  const event: AppealEvent = {
    at: now.toISOString(),
    actor: "executor",
    status: to,
    ...(clean ? { text: clean } : {}),
  };
  const patch: Partial<Appeal> = { status: to };
  if (to === "redirected" && redirectTo) {
    patch.organizationId = redirectTo.id;
    patch.organizationName = redirectTo.name;
    if (redirectTo.id === REGION_OFFICE.id && !appeal.external) {
      patch.external = { number: externalNumber([], now) };
    }
  }
  return { ok: true, appeal: withEvent(appeal, event, patch) };
}

/**
 * The person writes. When the executor asked for more, the reply puts the appeal back to review;
 * otherwise it is a message in the history. Nothing can be added to a closed appeal.
 */
export function applicantMessage(appeal: Appeal, text: string, now: Date): AppealChange {
  if (isClosedAppeal(appeal.status)) return { ok: false, reason: "closed" };
  const clean = text.trim().slice(0, MAX_MESSAGE);
  if (!clean) return { ok: false, reason: "text_required" };
  const replying = appeal.status === "info_required";
  return {
    ok: true,
    appeal: withEvent(
      appeal,
      {
        at: now.toISOString(),
        actor: "applicant",
        ...(replying ? { status: "in_review" as const } : {}),
        text: clean,
      },
      replying ? { status: "in_review" } : {},
    ),
  };
}

/** The person is satisfied with the answer and closes the appeal (spec 11.7: "closed"). */
export function applicantClose(appeal: Appeal, now: Date): AppealChange {
  if (appeal.status !== "executed" && appeal.status !== "answer_ready") {
    return { ok: false, reason: "not_allowed" };
  }
  return {
    ok: true,
    appeal: withEvent(
      appeal,
      { at: now.toISOString(), actor: "applicant", status: "closed" },
      {
        status: "closed",
      },
    ),
  };
}

/** The last words the executor wrote: the answer or the reason, to show next to the status. */
export function lastExecutorText(appeal: Pick<Appeal, "events">): string | undefined {
  for (let index = appeal.events.length - 1; index >= 0; index -= 1) {
    const event = appeal.events[index];
    if (event.actor === "executor" && event.text) return event.text;
  }
  return undefined;
}
