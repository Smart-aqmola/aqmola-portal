import type { ProviderInfo } from "@/features/account/domain/availability";
import type { Property } from "@/features/account/domain/property";
import {
  awaitsApplicant,
  isClosedAppeal,
  lastExecutorText,
  type Appeal,
} from "@/features/appeals/domain/appeal";
import { APPEAL_TONES } from "@/features/appeals/ui/appeal-badge";
import type { Application } from "@/features/applications/domain/application";
import type { Sector } from "@/features/catalog/domain/types";
import { connectedProviders } from "@/features/billing/domain/connected";
import type { ContractApplication } from "@/features/contracts/domain/contract";
import { CONTRACT_TONES } from "@/features/contracts/ui/status-badge";
import { sectorOfResource } from "@/features/meters/domain/meter";
import { requestForms, type MeterRequest } from "@/features/meters/domain/meter-request";
import { REQUEST_TONES } from "@/features/meters/ui/status-badges";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import type { RegistryItem } from "../domain/registry";

export type RegistryDict = Pick<
  Dictionary,
  "list" | "registry" | "applications" | "status" | "contracts" | "meters" | "appeals"
>;

export type RegistryContext = {
  lang: Locale;
  dict: RegistryDict;
  providers: readonly ProviderInfo[];
  missing: Record<string, readonly Sector[]>;
  properties: readonly Property[];
};

const SERVICE_TONES = {
  submitted: "new",
  in_progress: "work",
  done: "done",
  rejected: "problem",
} as const;
const CONTRACT_CLOSED = ["concluded", "active", "refused", "terminated"] as const;
const CONTRACT_BAD = ["refused", "terminated"] as const;

/** A service of the catalog ordered through the old wizard (spec 10.2: "other services"). */
export function fromApplication(app: Application, context: RegistryContext): RegistryItem {
  const { dict, providers } = context;
  const closed = app.status === "done" || app.status === "rejected";
  const last = app.history[app.history.length - 1];
  return {
    id: `service:${app.number}`,
    kind: "service",
    number: app.number,
    at: app.createdAt,
    title: app.serviceTitle,
    address: app.form.address,
    organization:
      providers.find((item) => item.id === app.organizationId)?.name ?? dict.registry.noValue,
    description: app.form.comment.trim(),
    status: dict.status[app.status],
    tone: SERVICE_TONES[app.status],
    closed,
    needsAction: false,
    remarks: app.status === "rejected" ? last?.note : undefined,
    result: closed ? dict.registry.results[app.status === "done" ? "done" : "refused"] : undefined,
    filesCount: app.form.attached.length,
    href: `/${context.lang}/applications/${app.number}`,
  };
}

/** An application for a contract: one line from the draft to the signed contract. */
export function fromContract(app: ContractApplication, context: RegistryContext): RegistryItem {
  const { dict } = context;
  const closed = (CONTRACT_CLOSED as readonly string[]).includes(app.status);
  const returned = app.status === "returned_for_revision";
  return {
    id: `contract:${app.id}`,
    kind: "contract",
    number: app.number,
    at: app.submittedAt ?? app.updatedAt,
    title: dict.contracts.sectorTitles[app.sector],
    address: app.address,
    organization: app.providerName,
    description: app.previousContract.trim(),
    status: dict.contracts.status[app.status],
    tone: CONTRACT_TONES[app.status],
    closed,
    needsAction: returned,
    actionLabel: returned ? dict.registry.actions.fix : undefined,
    actionHref: returned ? `/${context.lang}/contracts/${app.id}` : undefined,
    remarks: app.remarks,
    result: closed
      ? dict.registry.results[
          (CONTRACT_BAD as readonly string[]).includes(app.status) ? "refused" : "done"
        ]
      : undefined,
    filesCount: app.attachments.length,
    href: `/${context.lang}/contracts/${app.id}`,
  };
}

/** A request for work on a meter: the provider is the one serving the object for this resource. */
export function fromMeterRequest(request: MeterRequest, context: RegistryContext): RegistryItem {
  const { dict, providers, missing, properties } = context;
  const property = properties.find((item) => item.id === request.propertyId);
  const sector = sectorOfResource(request.resource);
  const organization = property
    ? connectedProviders(
        {
          territoryId: property.territoryId,
          without: property.addressId ? (missing[property.addressId] ?? []) : [],
        },
        providers,
      ).find((item) => item.sector === sector)?.name
    : undefined;
  const closed = request.status === "done" || request.status === "rejected";
  const asked = request.status === "info_requested";
  const reasons = dict.meters.request.reasons as Record<string, string>;
  const detail = requestForms[request.kind].details
    .map((spec) => request.details[spec.key])
    .find((value) => value && !/^\d{4}-\d{2}-\d{2}$/.test(value));
  const query = request.meterId ? `?meter=${request.meterId}` : `?property=${request.propertyId}`;
  return {
    id: `meter:${request.id}`,
    kind: "meter",
    number: request.number,
    at: request.createdAt,
    title: dict.meters.nav[request.kind],
    address: request.address,
    organization: organization ?? dict.registry.noValue,
    description: [reasons[request.reason] ?? request.reason, detail].filter(Boolean).join(". "),
    status: dict.meters.requestStatus[request.status],
    tone: REQUEST_TONES[request.status],
    closed,
    needsAction: asked,
    actionLabel: asked ? dict.registry.actions.again : undefined,
    actionHref: asked ? `/${context.lang}/meters/order/${request.kind}${query}` : undefined,
    assignee: request.assignee,
    remarks: request.remarks,
    result: closed
      ? dict.registry.results[request.status === "done" ? "done" : "refused"]
      : undefined,
    filesCount: request.attachments.length,
    href: `/${context.lang}/meters/requests/${request.id}`,
  };
}

/** An appeal or complaint (spec 10.2): the organization is the one chosen when it was sent. */
export function fromAppeal(appeal: Appeal, context: RegistryContext): RegistryItem {
  const { dict } = context;
  const asked = awaitsApplicant(appeal);
  const closed = isClosedAppeal(appeal.status);
  const subLabels = dict.appeals.subcategories[appeal.category] as Record<string, string>;
  const text = lastExecutorText(appeal);
  return {
    id: `appeal:${appeal.id}`,
    kind: "appeal",
    number: appeal.number,
    at: appeal.createdAt,
    title: dict.appeals.categories[appeal.category],
    address: appeal.address,
    organization: appeal.organizationName,
    description: [subLabels[appeal.subcategory], appeal.description].filter(Boolean).join(". "),
    status: dict.appeals.status[appeal.status],
    tone: APPEAL_TONES[appeal.status],
    closed,
    needsAction: asked,
    actionLabel: asked ? dict.registry.actions.reply : undefined,
    actionHref: asked ? `/${context.lang}/appeals/${appeal.id}` : undefined,
    remarks: asked || appeal.status === "refused" ? text : undefined,
    result: closed
      ? dict.registry.results[appeal.status === "refused" ? "refused" : "done"]
      : undefined,
    filesCount: appeal.attachments.length,
    href: `/${context.lang}/appeals/${appeal.id}`,
  };
}
