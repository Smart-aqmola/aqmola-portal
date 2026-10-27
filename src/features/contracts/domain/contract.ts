import { format } from "@/shared/i18n/format";
import { MAX_FILES, checkFile, type FileProblem } from "@/shared/lib/upload-rules";
import type { ContractSector } from "@/features/catalog/domain/contract-services";
import { isValidIinShape } from "@/features/account/domain/iin";
import { normalizePhone } from "@/features/account/domain/phone";
import type { PropertyType, Relation } from "@/features/account/domain/property";
import { nextYearNumber } from "@/shared/lib/numbering";

/** Statuses of a contract application, in the words of the specification (5.4). */
export const contractStatuses = [
  "draft",
  "not_sent",
  "registered",
  "under_review",
  "docs_check_required",
  "returned_for_revision",
  "awaiting_applicant_signature",
  "awaiting_provider_signature",
  "inspection_required",
  "technical_conditions_required",
  "concluded",
  "active",
  "suspended",
  "terminated",
  "refused",
] as const;
export type ContractStatus = (typeof contractStatuses)[number];

export type Actor = "applicant" | "provider";
export type HistoryEntry = { status: ContractStatus; at: string; actor: Actor; note?: string };

export type ApplicantInfo = {
  lastName: string;
  firstName: string;
  middleName: string;
  iin: string;
  phone: string;
  email: string;
};

export type MeterInfo = { has: boolean; serial: string; reading: string };
export const notifyChannels = ["cabinet", "email", "sms"] as const;
export type NotifyBy = (typeof notifyChannels)[number];

export const documentKeys = ["identity", "property", "proxy", "lease", "basis"] as const;
export type ContractDocumentKey = (typeof documentKeys)[number];
export type Attachment = { key: ContractDocumentKey; name: string; size: number };

/** A demo electronic signature: a mark with a name and a time, with no legal force. */
export type Signature = { name: string; at: string; method: "demo_ecp" };

export type Signatures = {
  application?: Signature;
  contractApplicant?: Signature;
  contractProvider?: Signature;
};

/** What a person may ask to change in a contract that is in force (spec 5.6). */
export const changeKinds = ["contacts", "account", "meter", "other"] as const;
export type ChangeKind = (typeof changeKinds)[number];

export type ChangeRequest = {
  id: string;
  kind: ChangeKind;
  text: string;
  at: string;
  status: "submitted";
};

export const MAX_CHANGE_TEXT = 500;
export const MAX_CHANGE_REQUESTS = 10;

export type ContractApplication = {
  id: string;
  ownerId: string;
  propertyId: string;
  sector: ContractSector;
  serviceSlug: string;
  serviceTitle: string;
  providerId: string;
  providerName: string;
  /** Given at registration (spec 4.10); a draft has none. */
  number?: string;
  applicant: ApplicantInfo;
  /** The address as written when the application was made, so it stays readable later. */
  address: string;
  propertyType: PropertyType;
  /** The ground for using the object (spec 4.5). */
  basis: Relation;
  /** ISO date, or "" when unknown. */
  rightSince: string;
  personalAccount: string;
  previousContract: string;
  meter: MeterInfo;
  notifyBy: NotifyBy;
  attachments: Attachment[];
  consents: { personalData: boolean; terms: boolean };
  signatures: Signatures;
  status: ContractStatus;
  history: HistoryEntry[];
  /** The provider's remarks when the application was returned or refused (spec 4.17, 4.18). */
  remarks?: string;
  submittedAt?: string;
  /** When the contract came into force. */
  startsAt?: string;
  /** Requests to change the data of the contract (spec 5.6). */
  changeRequests?: ChangeRequest[];
  version: number;
  createdAt: string;
  updatedAt: string;
};

export const NUMBER_PATTERN = /^DEMO-DOG-\d{4}-\d{5}$/;
export const MAX_CONTRACTS = 60;

/** Next free number of the year: DEMO-DOG-2026-00001, DEMO-DOG-2026-00002, ... */
export function nextContractNumber(existing: readonly { number?: string }[], now: Date): string {
  return nextYearNumber(
    "DEMO-DOG",
    existing.map((item) => item.number),
    now,
  );
}

// --- Draft -------------------------------------------------------------------------------------

type DraftInput = {
  propertyId: string;
  sector: ContractSector;
  serviceSlug: string;
  serviceTitle: string;
  providerId: string;
  providerName: string;
  applicant: ApplicantInfo;
  address: string;
  propertyType: PropertyType;
  basis: Relation;
  personalAccount: string;
};

/** A new draft, already filled with what the profile and the object know (spec 4.6). */
export function createDraft(
  input: DraftInput,
  id: string,
  ownerId: string,
  now: Date,
): ContractApplication {
  const at = now.toISOString();
  return {
    id,
    ownerId,
    ...input,
    rightSince: "",
    previousContract: "",
    meter: { has: false, serial: "", reading: "" },
    notifyBy: "cabinet",
    attachments: [],
    consents: { personalData: false, terms: false },
    signatures: {},
    status: "draft",
    history: [{ status: "draft", at, actor: "applicant" }],
    version: 1,
    createdAt: at,
    updatedAt: at,
  };
}

// --- Checks before sending (spec 4.8, 4.9) -------------------------------------------------------

export type ApplicationField =
  | "lastName"
  | "firstName"
  | "middleName"
  | "iin"
  | "phone"
  | "email"
  | "rightSince"
  | "personalAccount"
  | "previousContract"
  | "meterSerial"
  | "meterReading";
export type ApplicationErrors = Partial<Record<ApplicationField, string>>;

const NAME = /^[\p{L}][\p{L}\s'’-]*$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SERIAL = /^[\p{L}\d][\p{L}\d\s/-]*$/u;
const NUMBER = /^\d+([.,]\d+)?$/;
const ACCOUNT = /^\d{6,12}$/;

function nameError(value: string, optional: boolean): string | undefined {
  const text = value.trim();
  if (!text) return optional ? undefined : "required";
  if (text.length > 60) return "long";
  return NAME.test(text) ? undefined : "format";
}

/**
 * What the portal administrator may configure in the form of the application (spec 13.2, 20.3):
 * which documents each ground for using the object needs and which optional fields become required.
 */
export type ContractRules = {
  documents: Record<Relation, readonly ContractDocumentKey[]>;
  requiredFields: readonly ("rightSince" | "personalAccount" | "email")[];
};

export const DEFAULT_RULES: ContractRules = {
  documents: {
    owner: ["identity", "property"],
    representative: ["identity", "property", "proxy"],
    tenant: ["identity", "lease"],
    lawful_user: ["identity", "basis"],
  },
  requiredFields: [],
};

/** The fields of the application (spec 4.5). `today` is a parameter so the check is testable. */
export function validateApplication(
  app: ContractApplication,
  today: Date,
  rules: ContractRules = DEFAULT_RULES,
): ApplicationErrors {
  const errors: ApplicationErrors = {};
  const a = app.applicant;

  const lastName = nameError(a.lastName, false);
  if (lastName) errors.lastName = lastName;
  const firstName = nameError(a.firstName, false);
  if (firstName) errors.firstName = firstName;
  const middleName = nameError(a.middleName, true);
  if (middleName) errors.middleName = middleName;

  const iin = a.iin.replace(/\s/g, "");
  if (!iin) errors.iin = "required";
  else if (!isValidIinShape(iin)) errors.iin = "format";

  if (!a.phone.trim()) errors.phone = "required";
  else if (!normalizePhone(a.phone)) errors.phone = "format";

  const email = a.email.trim();
  if (email.length > 100) errors.email = "long";
  else if (email && !EMAIL.test(email)) errors.email = "format";
  else if (!email && app.notifyBy === "email") errors.email = "needed";
  else if (!email && rules.requiredFields.includes("email")) errors.email = "required";

  if (!app.rightSince && rules.requiredFields.includes("rightSince"))
    errors.rightSince = "required";
  if (app.rightSince) {
    const date = new Date(`${app.rightSince}T00:00:00Z`);
    const limit = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    if (Number.isNaN(date.getTime()) || date.getTime() > limit) errors.rightSince = "date";
  }

  const account = app.personalAccount.replace(/\s/g, "");
  if (!account && rules.requiredFields.includes("personalAccount"))
    errors.personalAccount = "required";
  if (account && !ACCOUNT.test(account)) errors.personalAccount = "format";
  if (app.previousContract.trim().length > 100) errors.previousContract = "long";

  if (app.meter.has) {
    const serial = app.meter.serial.trim();
    if (!serial) errors.meterSerial = "required";
    else if (serial.length > 30) errors.meterSerial = "long";
    else if (!SERIAL.test(serial)) errors.meterSerial = "format";
    const reading = app.meter.reading.trim();
    if (reading && !NUMBER.test(reading)) errors.meterReading = "format";
  }
  return errors;
}

/** Which documents the applicant must attach, by the ground for using the object (spec 4.3). */
export function requiredDocuments(
  basis: Relation,
  rules: ContractRules = DEFAULT_RULES,
): ContractDocumentKey[] {
  return [...rules.documents[basis]];
}

export type DocumentErrors = {
  /** Required documents that are not attached. */
  missing: ContractDocumentKey[];
  /** Attached files that cannot be accepted. */
  problems: { key: ContractDocumentKey; problem: FileProblem }[];
  tooMany: boolean;
};

export function validateDocuments(
  app: ContractApplication,
  rules: ContractRules = DEFAULT_RULES,
): DocumentErrors {
  const attached = new Set(app.attachments.map((file) => file.key));
  return {
    missing: requiredDocuments(app.basis, rules).filter((key) => !attached.has(key)),
    problems: app.attachments.flatMap((file) => {
      const problem = checkFile(file);
      return problem ? [{ key: file.key, problem }] : [];
    }),
    tooMany: app.attachments.length > MAX_FILES,
  };
}

export function documentsAreValid(errors: DocumentErrors): boolean {
  return errors.missing.length === 0 && errors.problems.length === 0 && !errors.tooMany;
}

/** Everything that must be right before the application is signed and sent. */
export type Readiness = {
  fields: ApplicationErrors;
  documents: DocumentErrors;
  consents: boolean;
  ready: boolean;
};

export function readiness(
  app: ContractApplication,
  today: Date,
  rules: ContractRules = DEFAULT_RULES,
): Readiness {
  const fields = validateApplication(app, today, rules);
  const documents = validateDocuments(app, rules);
  const consents = app.consents.personalData && app.consents.terms;
  return {
    fields,
    documents,
    consents,
    ready: Object.keys(fields).length === 0 && documentsAreValid(documents) && consents,
  };
}

// --- Moving through the statuses ---------------------------------------------------------------

/** What the provider may do next from each status (spec 4.16–4.18, 5.4). */
const providerNext: Record<ContractStatus, readonly ContractStatus[]> = {
  draft: [],
  not_sent: [],
  registered: ["under_review"],
  under_review: [
    "docs_check_required",
    "returned_for_revision",
    "inspection_required",
    "technical_conditions_required",
    "refused",
    "awaiting_applicant_signature",
  ],
  docs_check_required: ["under_review", "returned_for_revision", "refused"],
  returned_for_revision: [],
  awaiting_applicant_signature: [],
  awaiting_provider_signature: ["concluded"],
  inspection_required: ["under_review"],
  technical_conditions_required: ["under_review"],
  concluded: ["active"],
  active: ["suspended", "terminated"],
  suspended: ["active", "terminated"],
  terminated: [],
  refused: [],
};

export function providerOptions(status: ContractStatus): readonly ContractStatus[] {
  return providerNext[status];
}

export function isFinal(status: ContractStatus): boolean {
  return status === "terminated" || status === "refused";
}

/** A contract exists only after both sides signed. Sending the application is not enough (4.21). */
export function isConcluded(status: ContractStatus): boolean {
  return status === "concluded" || status === "active" || status === "suspended";
}

/** True once the provider has prepared the contract, so there is a text to read (spec 4.13). */
export function hasContractText(status: ContractStatus): boolean {
  return (
    status === "awaiting_applicant_signature" ||
    status === "awaiting_provider_signature" ||
    status === "concluded" ||
    status === "active" ||
    status === "suspended" ||
    status === "terminated"
  );
}

/** True while the applicant may still edit the application. */
export function isEditable(app: Pick<ContractApplication, "status">): boolean {
  return app.status === "draft" || app.status === "returned_for_revision";
}

export type ChangeResult =
  | { ok: true; application: ContractApplication }
  | { ok: false; reason: "forbidden" | "stale" | "not_ready" | "not_signed" | "no_remarks" };

function moved(
  app: ContractApplication,
  to: ContractStatus,
  actor: Actor,
  now: Date,
  note?: string,
): ContractApplication {
  const at = now.toISOString();
  return {
    ...app,
    status: to,
    history: [...app.history, { status: to, at, actor, ...(note ? { note } : {}) }],
    version: app.version + 1,
    updatedAt: at,
  };
}

function signatureOf(name: string, now: Date): Signature {
  return { name, at: now.toISOString(), method: "demo_ecp" };
}

/** Takes the signature of the application away: the text changed, so it no longer covers it. */
function withoutApplicationSignature(signatures: Signatures): Signatures {
  const rest = { ...signatures };
  delete rest.application;
  return rest;
}

/**
 * Applies a change the applicant made while editing. The signature of the application is dropped,
 * because it no longer covers the new text (spec 4.19).
 */
export function edited(
  app: ContractApplication,
  patch: Partial<Omit<ContractApplication, "signatures" | "status" | "history">>,
  now: Date,
): ContractApplication {
  return {
    ...app,
    ...patch,
    signatures: withoutApplicationSignature(app.signatures),
    updatedAt: now.toISOString(),
  };
}

/** The applicant signs the filled application; it must be complete first (spec 4.12). */
export function signApplication(
  app: ContractApplication,
  name: string,
  now: Date,
  rules: ContractRules = DEFAULT_RULES,
): ChangeResult {
  if (!isEditable(app)) return { ok: false, reason: "forbidden" };
  if (!readiness(app, now, rules).ready) return { ok: false, reason: "not_ready" };
  return {
    ok: true,
    application: {
      ...app,
      signatures: { ...app.signatures, application: signatureOf(name, now) },
      version: app.version + 1,
      updatedAt: now.toISOString(),
    },
  };
}

/**
 * Sends the signed application: it gets a number and a time and goes to the provider (spec 4.10).
 * A returned application keeps its number (spec 4.19).
 */
export function submitApplication(
  app: ContractApplication,
  number: string,
  now: Date,
  rules: ContractRules = DEFAULT_RULES,
): ChangeResult {
  if (!isEditable(app)) return { ok: false, reason: "forbidden" };
  if (!app.signatures.application) return { ok: false, reason: "not_signed" };
  if (!readiness(app, now, rules).ready) return { ok: false, reason: "not_ready" };
  const sent = moved(app, "registered", "applicant", now);
  const { remarks: _old, ...withoutRemarks } = sent;
  void _old;
  return {
    ok: true,
    application: {
      ...withoutRemarks,
      number: app.number ?? number,
      submittedAt: now.toISOString(),
    },
  };
}

/** The provider moves the application on; `note` is required when it is returned or refused. */
export function providerChange(
  app: ContractApplication,
  to: ContractStatus,
  now: Date,
  note?: string,
  expectedVersion: number = app.version,
): ChangeResult {
  if (expectedVersion !== app.version) return { ok: false, reason: "stale" };
  if (!providerNext[app.status].includes(to)) return { ok: false, reason: "forbidden" };
  const withRemarks = to === "returned_for_revision" || to === "refused";
  if (withRemarks && !note?.trim()) return { ok: false, reason: "no_remarks" };

  const next = moved(app, to, "provider", now, note);
  return {
    ok: true,
    application: {
      ...next,
      ...(withRemarks ? { remarks: note } : {}),
      ...(to === "active" && !app.startsAt ? { startsAt: now.toISOString() } : {}),
      ...(to === "concluded"
        ? { signatures: { ...app.signatures, contractProvider: signatureOf("Поставщик", now) } }
        : {}),
    },
  };
}

/** The applicant signs the contract the provider prepared (spec 4.12, 4.14). */
export function signContract(app: ContractApplication, name: string, now: Date): ChangeResult {
  if (app.status !== "awaiting_applicant_signature") return { ok: false, reason: "forbidden" };
  const next = moved(app, "awaiting_provider_signature", "applicant", now);
  return {
    ok: true,
    application: {
      ...next,
      signatures: { ...app.signatures, contractApplicant: signatureOf(name, now) },
    },
  };
}

// --- Texts built from the data ------------------------------------------------------------------

export function applicantName(
  a: Pick<ApplicantInfo, "lastName" | "firstName" | "middleName">,
): string {
  return [a.lastName, a.firstName, a.middleName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

/** Fills the contract template of the dictionary with the data of the application (spec 4.13). */
export function contractText(app: ContractApplication, lines: readonly string[]): string {
  const values = {
    number: app.number ?? "—",
    service: app.serviceTitle,
    provider: app.providerName,
    applicant: applicantName(app.applicant),
    address: app.address,
    account: app.personalAccount || "—",
  };
  return lines.map((line) => format(line, values)).join("\n\n");
}

// --- Change of a contract (spec 5.6) -----------------------------------------------------------

export type ChangeRequestResult =
  | { ok: true; application: ContractApplication }
  | { ok: false; reason: "forbidden" | "text" | "too_many" };

/** Only a contract in force may be changed; the request needs a description of what to change. */
export function requestChange(
  app: ContractApplication,
  input: { kind: ChangeKind; text: string },
  id: string,
  now: Date,
): ChangeRequestResult {
  if (!isConcluded(app.status)) return { ok: false, reason: "forbidden" };
  const text = input.text.trim();
  if (text.length < 3 || text.length > MAX_CHANGE_TEXT) return { ok: false, reason: "text" };
  const existing = app.changeRequests ?? [];
  if (existing.length >= MAX_CHANGE_REQUESTS) return { ok: false, reason: "too_many" };
  const at = now.toISOString();
  return {
    ok: true,
    application: {
      ...app,
      changeRequests: [{ id, kind: input.kind, text, at, status: "submitted" }, ...existing],
      version: app.version + 1,
      updatedAt: at,
    },
  };
}

/** The date the contract was signed by both sides, or undefined while it is not (spec 5.3). */
export function signedAt(app: Pick<ContractApplication, "signatures">): string | undefined {
  const { contractApplicant, contractProvider } = app.signatures;
  if (!contractApplicant || !contractProvider) return undefined;
  return contractApplicant.at > contractProvider.at ? contractApplicant.at : contractProvider.at;
}

export type AccountResult =
  { ok: true; application: ContractApplication } | { ok: false; reason: "invalid" | "closed" };

/**
 * The provider gives the applicant a personal account or links one that exists (spec 12.4). It can
 * be done until the application is closed for good; the history of statuses is not touched.
 */
export function assignAccount(app: ContractApplication, account: string, now: Date): AccountResult {
  const clean = account.trim();
  if (!ACCOUNT.test(clean)) return { ok: false, reason: "invalid" };
  if (app.status === "draft" || app.status === "refused" || app.status === "terminated") {
    return { ok: false, reason: "closed" };
  }
  return {
    ok: true,
    application: {
      ...app,
      personalAccount: clean,
      version: app.version + 1,
      updatedAt: now.toISOString(),
    },
  };
}
