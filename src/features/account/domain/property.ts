import { MAX_FILES, checkFile } from "@/shared/lib/upload-rules";

export const propertyTypes = ["apartment", "house", "non_residential", "other"] as const;
export type PropertyType = (typeof propertyTypes)[number];

/** How the person is connected to the object (spec 2.6, 3.4). */
export const relations = ["owner", "representative", "tenant", "lawful_user"] as const;
export type Relation = (typeof relations)[number];

/** `unverified` is the state right after adding; the other three come from spec 3.6. */
export const verificationStatuses = [
  "unverified",
  "pending_check",
  "confirmed",
  "rejected",
] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];

export type VerificationMethod = "state_integration" | "document";

/** Only the name and size of an uploaded file are kept in the browser. */
export type StoredFile = { name: string; size: number };

export type Verification = {
  status: VerificationStatus;
  method?: VerificationMethod;
  documents: StoredFile[];
  /** The employee's comment when the object was rejected. */
  note?: string;
  at?: string;
};

export type Property = {
  id: string;
  ownerId: string;
  territoryId: string;
  locality: string;
  street: string;
  house: string;
  flat?: string;
  type: PropertyType;
  relation: Relation;
  personalAccount?: string;
  /** The owner or the lawful user: a name or the name of an organization (spec 3.1). */
  ownerInfo: string;
  /** Set when the address was picked from the directory rather than typed by hand. */
  addressId?: string;
  verification: Verification;
  version: number;
  createdAt: string;
};

export type PropertyInput = {
  territoryId: string;
  locality: string;
  street: string;
  house: string;
  flat: string;
  type: PropertyType | "";
  relation: Relation | "";
  personalAccount: string;
  ownerInfo: string;
  addressId?: string;
};

export type PropertyField = Exclude<keyof PropertyInput, "addressId">;
/** `required` | `long` | `format`: the form turns the code into a text in the person's language. */
export type PropertyErrors = Partial<Record<PropertyField, string>>;

export const MAX_PLACE = 80;
export const MAX_HOUSE = 10;
export const MAX_OWNER_INFO = 120;
export const MAX_PROPERTIES = 30;

const HOUSE = /^[\p{L}\d][\p{L}\d\s/-]*$/u;
const ACCOUNT = /^\d{6,12}$/;

function checkText(value: string, max: number): string | undefined {
  const text = value.trim();
  if (!text) return "required";
  return text.length > max ? "long" : undefined;
}

function checkNumber(value: string, optional: boolean): string | undefined {
  const text = value.trim();
  if (!text) return optional ? undefined : "required";
  if (text.length > MAX_HOUSE) return "long";
  return HOUSE.test(text) ? undefined : "format";
}

/** Checks the form for an object. An empty result means it can be saved (spec 3.5). */
export function validateProperty(
  input: PropertyInput,
  territoryIds: readonly string[],
): PropertyErrors {
  const errors: PropertyErrors = {};

  if (!input.territoryId || !territoryIds.includes(input.territoryId))
    errors.territoryId = "required";
  const locality = checkText(input.locality, MAX_PLACE);
  if (locality) errors.locality = locality;
  const street = checkText(input.street, MAX_PLACE);
  if (street) errors.street = street;
  const house = checkNumber(input.house, false);
  if (house) errors.house = house;

  if (!(propertyTypes as readonly string[]).includes(input.type)) errors.type = "required";
  const flat = checkNumber(input.flat, input.type !== "apartment");
  if (flat) errors.flat = flat;
  if (!(relations as readonly string[]).includes(input.relation)) errors.relation = "required";

  const account = input.personalAccount.replace(/\s/g, "");
  if (account && !ACCOUNT.test(account)) errors.personalAccount = "format";
  const ownerInfo = checkText(input.ownerInfo, MAX_OWNER_INFO);
  if (ownerInfo) errors.ownerInfo = ownerInfo;

  return errors;
}

/** Builds the object from a form that already passed `validateProperty`. */
export function createProperty(
  input: PropertyInput,
  id: string,
  ownerId: string,
  now: Date,
): Property {
  const flat = input.flat.trim();
  const account = input.personalAccount.replace(/\s/g, "");
  return {
    id,
    ownerId,
    territoryId: input.territoryId,
    locality: input.locality.trim(),
    street: input.street.trim(),
    house: input.house.trim(),
    ...(flat ? { flat } : {}),
    type: input.type as PropertyType,
    relation: input.relation as Relation,
    ...(account ? { personalAccount: account } : {}),
    ownerInfo: input.ownerInfo.trim(),
    ...(input.addressId ? { addressId: input.addressId } : {}),
    verification: { status: "unverified", documents: [] },
    version: 1,
    createdAt: now.toISOString(),
  };
}

export type VerificationRequest =
  { method: "state_integration" } | { method: "document"; documents: readonly StoredFile[] };

export type VerificationResult =
  { ok: true; property: Property } | { ok: false; reason: "forbidden" | "documents" | "file" };

/**
 * The owner asks for the object to be confirmed (spec 3.4). Through the state service the answer
 * is immediate (a demo stand-in); with documents the object waits for an employee (spec 3.6).
 */
export function requestVerification(
  property: Property,
  request: VerificationRequest,
  now: Date,
): VerificationResult {
  const { status } = property.verification;
  if (status !== "unverified" && status !== "rejected") return { ok: false, reason: "forbidden" };
  const at = now.toISOString();

  if (request.method === "state_integration") {
    return {
      ok: true,
      property: {
        ...property,
        verification: { status: "confirmed", method: "state_integration", documents: [], at },
        version: property.version + 1,
      },
    };
  }

  if (request.documents.length === 0 || request.documents.length > MAX_FILES) {
    return { ok: false, reason: "documents" };
  }
  if (request.documents.some((file) => checkFile(file) !== null)) {
    return { ok: false, reason: "file" };
  }
  return {
    ok: true,
    property: {
      ...property,
      verification: {
        status: "pending_check",
        method: "document",
        documents: request.documents.map(({ name, size }) => ({ name, size })),
        at,
      },
      version: property.version + 1,
    },
  };
}

/** The employee's decision on documents that are waiting (a demo control, spec 3.6). */
export function decideVerification(
  property: Property,
  decision: "confirmed" | "rejected",
  note: string | undefined,
  now: Date,
): VerificationResult {
  if (property.verification.status !== "pending_check") return { ok: false, reason: "forbidden" };
  return {
    ok: true,
    property: {
      ...property,
      verification: {
        ...property.verification,
        status: decision,
        ...(decision === "rejected" && note ? { note } : {}),
        at: now.toISOString(),
      },
      version: property.version + 1,
    },
  };
}

/** Contracts and other applications by this address need a confirmed object (spec 3.7). */
export function canOrderServices(property: Pick<Property, "verification">): boolean {
  return property.verification.status === "confirmed";
}

/** "Кокшетау, ул. Абая, 10, кв. 5" */
export function addressLine(
  property: Pick<Property, "locality" | "street" | "house" | "flat">,
  territoryName: string,
  flatWord: string,
): string {
  const place =
    property.locality.trim().toLowerCase() === territoryName.trim().toLowerCase()
      ? territoryName
      : `${territoryName}, ${property.locality}`;
  const flat = property.flat ? `, ${flatWord} ${property.flat}` : "";
  return `${place}, ${property.street}, ${property.house}${flat}`;
}
