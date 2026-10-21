import { relations, type Relation } from "@/features/account/domain/property";
import {
  DEFAULT_RULES,
  documentKeys,
  type ContractDocumentKey,
  type ContractRules,
} from "@/features/contracts/domain/contract";
import {
  notificationEvents,
  type NotificationEvent,
} from "@/features/notifications/domain/notifications";
import {
  REGULATION_DAYS,
  registryKinds,
  type RegistryKind,
} from "@/features/registry/domain/registry";
import { locales, type Locale } from "@/shared/i18n/config";

/** Roles of the staff of an organization (spec 2.6). */
export const staffRoles = [
  "contact_operator",
  "request_specialist",
  "inspector",
  "meter_specialist",
  "accountant",
  "organization_admin",
] as const;
export type StaffRole = (typeof staffRoles)[number];

export type StaffMember = {
  id: string;
  organizationId: string;
  name: string;
  role: StaffRole;
  blocked: boolean;
};

export const optionalFields = ["rightSince", "personalAccount", "email"] as const;
export type OptionalField = (typeof optionalFields)[number];

/** Languages shown in the switcher; Russian always stays (spec 18.9). */
export type Templates = Record<"ru" | "kk", Partial<Record<NotificationEvent, string>>>;

/**
 * What the portal administrator can change without changing the code (spec 13.2, 20.3): blocked
 * organizations, staff and roles, languages, terms, the form of the application and the texts of
 * notifications. Every change is written to the journal (spec 13.4).
 */
export type AdminConfig = {
  blockedOrganizations: string[];
  staff: StaffMember[];
  languages: Locale[];
  regulationDays: Record<RegistryKind, number>;
  /** Whether sums of payments are shown in reports (spec 17.4). */
  financeAccess: boolean;
  documents: Record<Relation, ContractDocumentKey[]>;
  requiredFields: OptionalField[];
  templates: Templates;
};

export const CONFIG_KEY = "aqmola:admin-config";
export const MIN_DAYS = 1;
export const MAX_DAYS = 60;
export const MAX_STAFF = 60;
export const MAX_TEMPLATE = 400;

export const DEFAULT_CONFIG: AdminConfig = {
  blockedOrganizations: [],
  staff: [],
  languages: ["ru", "kk"],
  regulationDays: { ...REGULATION_DAYS },
  financeAccess: true,
  documents: {
    owner: [...DEFAULT_RULES.documents.owner],
    representative: [...DEFAULT_RULES.documents.representative],
    tenant: [...DEFAULT_RULES.documents.tenant],
    lawful_user: [...DEFAULT_RULES.documents.lawful_user],
  },
  requiredFields: [],
  templates: { ru: {}, kk: {} },
};

/** What the form of the application needs to know (spec 4.3, 4.5). */
export function contractRules(config: AdminConfig): ContractRules {
  return { documents: config.documents, requiredFields: config.requiredFields };
}

const ID = /^[a-z0-9-]{1,60}$/;
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const list = <T extends string>(value: unknown, allowed: readonly T[]): T[] | undefined =>
  Array.isArray(value)
    ? [...new Set(value.filter((item): item is T => allowed.includes(item as T)))]
    : undefined;

function parseTemplates(value: unknown): Templates {
  const result: Templates = { ru: {}, kk: {} };
  if (!isObject(value)) return result;
  for (const lang of ["ru", "kk"] as const) {
    const texts = value[lang];
    if (!isObject(texts)) continue;
    for (const event of notificationEvents) {
      const text = texts[event];
      if (typeof text === "string" && text.trim() && text.length <= MAX_TEMPLATE) {
        result[lang][event] = text;
      }
    }
  }
  return result;
}

function parseStaff(value: unknown): StaffMember[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is StaffMember =>
        isObject(item) &&
        typeof item.id === "string" &&
        ID.test(item.id) &&
        typeof item.organizationId === "string" &&
        ID.test(item.organizationId) &&
        typeof item.name === "string" &&
        item.name.trim().length > 0 &&
        item.name.length <= 80 &&
        (staffRoles as readonly unknown[]).includes(item.role) &&
        typeof item.blocked === "boolean",
    )
    .slice(0, MAX_STAFF);
}

/** Reads the saved settings defensively and fills in the defaults for whatever is missing or wrong. */
export function parseConfig(raw: string | null): AdminConfig {
  if (!raw) return DEFAULT_CONFIG;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return DEFAULT_CONFIG;
  }
  if (!isObject(value)) return DEFAULT_CONFIG;

  const blocked = Array.isArray(value.blockedOrganizations)
    ? value.blockedOrganizations.filter((id): id is string => typeof id === "string" && ID.test(id))
    : [];
  const languages = list(value.languages, locales) ?? DEFAULT_CONFIG.languages;
  const days = isObject(value.regulationDays) ? value.regulationDays : {};
  const regulationDays = Object.fromEntries(
    registryKinds.map((kind) => {
      const entry = days[kind];
      const valid =
        typeof entry === "number" &&
        Number.isInteger(entry) &&
        entry >= MIN_DAYS &&
        entry <= MAX_DAYS;
      return [kind, valid ? entry : REGULATION_DAYS[kind]];
    }),
  ) as Record<RegistryKind, number>;
  const docs = isObject(value.documents) ? value.documents : {};
  const documents = Object.fromEntries(
    relations.map((relation) => [
      relation,
      list(docs[relation], documentKeys) ?? DEFAULT_CONFIG.documents[relation],
    ]),
  ) as Record<Relation, ContractDocumentKey[]>;

  return {
    blockedOrganizations: [...new Set(blocked)],
    staff: parseStaff(value.staff),
    // Russian cannot be switched off: the portal must always have a language to fall back to.
    languages: languages.includes("ru") ? languages : ["ru", ...languages],
    regulationDays,
    financeAccess: typeof value.financeAccess === "boolean" ? value.financeAccess : true,
    documents,
    requiredFields: list(value.requiredFields, optionalFields) ?? [],
    templates: parseTemplates(value.templates),
  };
}

/** The settings that differ between two states, as a list of names for the journal (spec 13.4). */
export function changedParameters(before: AdminConfig, after: AdminConfig): string[] {
  const names: string[] = [];
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(before.blockedOrganizations, after.blockedOrganizations))
    names.push("blockedOrganizations");
  if (!same(before.staff, after.staff)) names.push("staff");
  if (!same(before.languages, after.languages)) names.push("languages");
  for (const kind of registryKinds) {
    if (before.regulationDays[kind] !== after.regulationDays[kind])
      names.push(`regulationDays.${kind}`);
  }
  if (before.financeAccess !== after.financeAccess) names.push("financeAccess");
  for (const relation of relations) {
    if (!same(before.documents[relation], after.documents[relation]))
      names.push(`documents.${relation}`);
  }
  if (!same(before.requiredFields, after.requiredFields)) names.push("requiredFields");
  for (const lang of ["ru", "kk"] as const) {
    for (const event of notificationEvents) {
      if (before.templates[lang][event] !== after.templates[lang][event])
        names.push(`templates.${lang}.${event}`);
    }
  }
  return names;
}

/** The text of a notification the administrator wrote, if any (spec 16.5). */
export function templateFor(
  config: AdminConfig,
  lang: Locale,
  event: NotificationEvent,
): string | undefined {
  return lang === "ru" || lang === "kk" ? config.templates[lang][event] : undefined;
}
