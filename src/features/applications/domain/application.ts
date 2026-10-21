import type { DocumentKey } from "@/features/catalog/domain/service-details";
import { canTransition, type ApplicationStatus } from "./status";

export type DemoRole = "resident" | "business" | "operator" | "admin";
export type ApplicantRole = Exclude<DemoRole, "operator" | "admin">;

/** Staff of an organization and of the portal: they work in their own cabinets, not as applicants (spec 19.6). */
export const isStaffRole = (role: DemoRole): role is "operator" | "admin" =>
  role === "operator" || role === "admin";

export type ApplicationForm = {
  territoryId: string;
  address: string;
  attached: DocumentKey[];
  comment: string;
  consent: boolean;
};

export type HistoryEntry = { status: ApplicationStatus; at: string; note?: string };

export type Application = {
  number: string;
  serviceSlug: string;
  serviceTitle: string;
  organizationId: string;
  ownerRole: ApplicantRole;
  ownerName: string;
  form: ApplicationForm;
  status: ApplicationStatus;
  /** Raised on every change, so a change made on stale data can be refused. */
  version: number;
  createdAt: string;
  history: HistoryEntry[];
};

export const NUMBER_PATTERN = /^DEMO-\d{4}-\d{5}$/;
export const MAX_COMMENT = 300;
export const MIN_ADDRESS = 3;
export const MAX_ADDRESS = 120;

/** Next free number of the year: DEMO-2026-00001, DEMO-2026-00002, ... */
export function nextNumber(existing: readonly { number: string }[], now: Date): string {
  const year = now.getUTCFullYear();
  const prefix = `DEMO-${year}-`;
  const highest = existing
    .filter((item) => item.number.startsWith(prefix))
    .reduce((max, item) => Math.max(max, Number(item.number.slice(prefix.length))), 0);
  return `${prefix}${String(highest + 1).padStart(5, "0")}`;
}

/** Residents order services for residents, business for business; "both" suits either. */
export function canApply(
  role: DemoRole,
  audience: "resident" | "business" | "both",
): role is ApplicantRole {
  if (isStaffRole(role)) return false;
  return audience === "both" || audience === role;
}

export type StepName = "object" | "documents" | "review" | "sign";
export const stepNames: readonly StepName[] = ["object", "documents", "review", "sign"];

export type FormErrors = Partial<
  Record<"territoryId" | "address" | "attached" | "comment" | "consent", string>
>;

/** Checks one step of the form. An empty result means the step may be left. */
export function validateStep(
  step: StepName,
  form: ApplicationForm,
  requiredDocuments: readonly DocumentKey[],
): FormErrors {
  const errors: FormErrors = {};
  if (step === "object") {
    if (!form.territoryId) errors.territoryId = "required";
    const address = form.address.trim();
    if (!address) errors.address = "required";
    else if (address.length < MIN_ADDRESS) errors.address = "short";
    else if (address.length > MAX_ADDRESS) errors.address = "long";
  }
  if (step === "documents") {
    if (requiredDocuments.some((key) => !form.attached.includes(key))) errors.attached = "missing";
  }
  if (step === "review") {
    if (form.comment.trim().length > MAX_COMMENT) errors.comment = "long";
  }
  if (step === "sign") {
    if (!form.consent) errors.consent = "required";
  }
  return errors;
}

type CreateInput = {
  serviceSlug: string;
  serviceTitle: string;
  organizationId: string;
  ownerRole: ApplicantRole;
  ownerName: string;
  form: ApplicationForm;
  number: string;
  now: Date;
};

export function createApplication(input: CreateInput): Application {
  const at = input.now.toISOString();
  return {
    number: input.number,
    serviceSlug: input.serviceSlug,
    serviceTitle: input.serviceTitle,
    organizationId: input.organizationId,
    ownerRole: input.ownerRole,
    ownerName: input.ownerName,
    form: {
      ...input.form,
      address: input.form.address.trim(),
      comment: input.form.comment.trim(),
    },
    status: "submitted",
    version: 1,
    createdAt: at,
    history: [{ status: "submitted", at }],
  };
}

export type ChangeResult =
  { ok: true; application: Application } | { ok: false; reason: "forbidden" | "stale" };

/**
 * Moves an application to a new status without touching the original.
 * `expectedVersion` is what the person saw on screen; a mismatch means somebody changed it meanwhile.
 */
export function changeStatus(
  application: Application,
  to: ApplicationStatus,
  now: Date,
  note?: string,
  expectedVersion: number = application.version,
): ChangeResult {
  if (expectedVersion !== application.version) return { ok: false, reason: "stale" };
  if (!canTransition(application.status, to)) return { ok: false, reason: "forbidden" };
  const entry: HistoryEntry = { status: to, at: now.toISOString(), ...(note ? { note } : {}) };
  return {
    ok: true,
    application: {
      ...application,
      status: to,
      version: application.version + 1,
      history: [...application.history, entry],
    },
  };
}
