import type { ContractSector, ProviderInfo } from "@/features/account/domain/availability";
import type { Profile } from "@/features/account/domain/profile";
import type { Property } from "@/features/account/domain/property";
import type { Appeal } from "@/features/appeals/domain/appeal";
import { isClosedAppeal } from "@/features/appeals/domain/appeal";
import type { Application } from "@/features/applications/domain/application";
import { PERIODS_SHOWN, periodOf, periodsBack } from "@/features/billing/domain/charge";
import type { Payment } from "@/features/billing/domain/payment";
import type { ContractApplication } from "@/features/contracts/domain/contract";
import { sectorOfResource, type Meter } from "@/features/meters/domain/meter";
import type { MeterRequest } from "@/features/meters/domain/meter-request";
import type { Reading } from "@/features/meters/domain/reading";
import { orgFromProviders, readingsOf, requestsOf } from "@/features/organization/domain/scope";
import { REGULATION_DAYS, type RegistryKind } from "@/features/registry/domain/registry";
import type { IntegrationError, IntegrationSystem } from "./integrations";

/** The indicators of the report, in the order of the specification (17.1). */
export const indicatorIds = [
  "users",
  "properties",
  "providers",
  "contractApplications",
  "contractsConcluded",
  "underReview",
  "refused",
  "meterRequests",
  "readingsSent",
  "readingsAccepted",
  "readingsRejected",
  "receipts",
  "payments",
  "paymentsSum",
  "appeals",
  "deadlines",
  "integrationErrors",
  "availability",
] as const;
export type IndicatorId = (typeof indicatorIds)[number];

/** A coarse status that every kind of request can be put into (spec 17.2). */
export const statusGroups = ["open", "done", "refused"] as const;
export type StatusGroup = (typeof statusGroups)[number];

export type ReportFilter = {
  /** `YYYY-MM-DD` or "" for no limit. */
  from: string;
  to: string;
  territoryId: string;
  organizationId: string;
  sector: ContractSector | "";
  status: StatusGroup | "";
};

export const emptyFilter: ReportFilter = {
  from: "",
  to: "",
  territoryId: "",
  organizationId: "",
  sector: "",
  status: "",
};

export type ReportSources = {
  profiles: readonly Pick<Profile, "createdAt">[];
  properties: readonly Property[];
  providers: readonly ProviderInfo[];
  applications: readonly Application[];
  contracts: readonly ContractApplication[];
  meters: readonly Meter[];
  readings: readonly Reading[];
  requests: readonly MeterRequest[];
  payments: readonly Payment[];
  appeals: readonly Appeal[];
  systems: readonly IntegrationSystem[];
  errors: readonly IntegrationError[];
};

export type Indicator = {
  id: IndicatorId;
  /** `null` when there is nothing to compute it from (no closed requests, no systems). */
  value: number | null;
  unit: "count" | "percent" | "money";
  /** Shown only to those who may see financial data (spec 17.4). */
  financial: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const contractGroup = (status: ContractApplication["status"]): StatusGroup =>
  status === "concluded" || status === "active"
    ? "done"
    : status === "refused" || status === "terminated"
      ? "refused"
      : "open";
const requestGroup = (status: MeterRequest["status"]): StatusGroup =>
  status === "done" ? "done" : status === "rejected" ? "refused" : "open";
const readingGroup = (status: Reading["status"]): StatusGroup =>
  status === "accepted" || status === "passed_to_system" || status === "processed"
    ? "done"
    : status === "rejected"
      ? "refused"
      : "open";
const appealGroup = (status: Appeal["status"]): StatusGroup =>
  status === "refused" ? "refused" : isClosedAppeal(status) ? "done" : "open";
const paymentGroup = (status: Payment["status"]): StatusGroup =>
  status === "paid"
    ? "done"
    : status === "declined" || status === "cancelled" || status === "refunded"
      ? "refused"
      : "open";

/** Builds the report for the filter (spec 17.1, 17.2). Pure: the same sources and filter give the same numbers. */
export function buildReport(
  sources: ReportSources,
  filter: ReportFilter,
  now: Date,
  days: Record<RegistryKind, number> = REGULATION_DAYS,
): Indicator[] {
  const inPeriod = (iso: string | undefined): boolean => {
    if (!iso) return false;
    const day = iso.slice(0, 10);
    return (!filter.from || day >= filter.from) && (!filter.to || day <= filter.to);
  };
  const territoryOf = (propertyId: string | undefined) =>
    sources.properties.find((item) => item.id === propertyId)?.territoryId;
  const territoryOk = (propertyId: string | undefined) =>
    !filter.territoryId || territoryOf(propertyId) === filter.territoryId;
  const sectorOk = (sector: string | undefined) => !filter.sector || sector === filter.sector;
  const orgInfo = filter.organizationId
    ? orgFromProviders(filter.organizationId, sources.providers)
    : undefined;
  const statusOk = (group: StatusGroup) => !filter.status || filter.status === group;

  const contracts = sources.contracts.filter(
    (item) =>
      item.status !== "draft" &&
      inPeriod(item.submittedAt) &&
      territoryOk(item.propertyId) &&
      sectorOk(item.sector) &&
      (!filter.organizationId || item.providerId === filter.organizationId),
  );

  const scopedRequests = orgInfo
    ? requestsOf(orgInfo, sources.requests, sources.properties)
    : [...sources.requests];
  const requests = scopedRequests.filter(
    (item) =>
      inPeriod(item.createdAt) &&
      territoryOk(item.propertyId) &&
      sectorOk(sectorOfResource(item.resource)),
  );

  const scopedReadings = orgInfo
    ? readingsOf(orgInfo, sources.readings, sources.meters, sources.properties)
    : [...sources.readings];
  const readings = scopedReadings.filter((item) => {
    const meter = sources.meters.find((entry) => entry.id === item.meterId);
    return (
      inPeriod(item.submittedAt) &&
      territoryOk(item.propertyId) &&
      sectorOk(meter ? sectorOfResource(meter.resource) : undefined)
    );
  });

  const appeals = sources.appeals.filter(
    (item) =>
      inPeriod(item.createdAt) &&
      territoryOk(item.propertyId) &&
      sectorOk(item.sector) &&
      (!filter.organizationId || item.organizationId === filter.organizationId),
  );

  const applications = sources.applications.filter(
    (item) =>
      inPeriod(item.createdAt) &&
      (!filter.organizationId || item.organizationId === filter.organizationId) &&
      (!filter.territoryId || item.form.territoryId === filter.territoryId),
  );

  const payments = sources.payments
    .map((payment) => ({
      payment,
      lines: payment.lines.filter(
        (line) =>
          sectorOk(line.sector) &&
          (!filter.organizationId || line.providerId === filter.organizationId),
      ),
    }))
    .filter(
      ({ payment, lines }) =>
        lines.length > 0 && inPeriod(payment.createdAt) && territoryOk(payment.propertyId),
    );

  const properties = sources.properties.filter(
    (item) =>
      inPeriod(item.createdAt) && (!filter.territoryId || item.territoryId === filter.territoryId),
  );

  const providers = sources.providers.filter(
    (item) =>
      sectorOk(item.sector) &&
      (!filter.organizationId || item.id === filter.organizationId) &&
      (!filter.territoryId ||
        item.territories === "all" ||
        item.territories.includes(filter.territoryId)),
  );

  // A receipt is made for an object for a month, so a confirmed object gives one for each month in range.
  const months = periodsBack(periodOf(now), PERIODS_SHOWN).filter(
    (month) => inPeriod(`${month}-15`) || inPeriod(`${month}-01`),
  );
  const receipts =
    sources.properties.filter(
      (item) =>
        item.verification.status === "confirmed" &&
        (!filter.territoryId || item.territoryId === filter.territoryId),
    ).length * months.length;

  // Closed on time: the day it was closed is not later than the day by which it had to be.
  const closed: { kind: RegistryKind; from: string; to: string }[] = [
    ...applications.flatMap((item) => {
      const last = item.history[item.history.length - 1];
      return item.status === "done" || item.status === "rejected"
        ? [{ kind: "service" as const, from: item.createdAt, to: last.at }]
        : [];
    }),
    ...contracts.flatMap((item) =>
      contractGroup(item.status) !== "open"
        ? [
            {
              kind: "contract" as const,
              from: item.submittedAt ?? item.createdAt,
              to: item.updatedAt,
            },
          ]
        : [],
    ),
    ...requests.flatMap((item) =>
      item.status === "done" || item.status === "rejected"
        ? [{ kind: "meter" as const, from: item.createdAt, to: item.updatedAt }]
        : [],
    ),
    ...appeals.flatMap((item) =>
      isClosedAppeal(item.status)
        ? [{ kind: "appeal" as const, from: item.createdAt, to: item.updatedAt }]
        : [],
    ),
  ];
  const onTime = closed.filter(
    (item) => Date.parse(item.to) - Date.parse(item.from) <= days[item.kind] * DAY_MS,
  ).length;

  const systems = sources.systems.filter(
    (item) =>
      !filter.organizationId || item.id === filter.organizationId || item.kind !== "provider",
  );
  const errors = sources.errors.filter(
    (item) =>
      inPeriod(item.at) &&
      (!filter.organizationId ||
        item.systemId === filter.organizationId ||
        !sources.providers.some((provider) => provider.id === item.systemId)),
  );

  const count = (value: number): Indicator["value"] => value;
  const make = (
    id: IndicatorId,
    value: Indicator["value"],
    unit: Indicator["unit"] = "count",
    financial = false,
  ): Indicator => ({ id, value, unit, financial });

  return [
    make("users", count(sources.profiles.filter((item) => inPeriod(item.createdAt)).length)),
    make("properties", count(properties.length)),
    make("providers", count(providers.length)),
    make(
      "contractApplications",
      count(contracts.filter((item) => statusOk(contractGroup(item.status))).length),
    ),
    make(
      "contractsConcluded",
      count(
        contracts.filter((item) => item.status === "concluded" || item.status === "active").length,
      ),
    ),
    make(
      "underReview",
      count(contracts.filter((item) => contractGroup(item.status) === "open").length),
    ),
    make("refused", count(contracts.filter((item) => item.status === "refused").length)),
    make(
      "meterRequests",
      count(requests.filter((item) => statusOk(requestGroup(item.status))).length),
    ),
    make(
      "readingsSent",
      count(readings.filter((item) => statusOk(readingGroup(item.status))).length),
    ),
    make(
      "readingsAccepted",
      count(readings.filter((item) => readingGroup(item.status) === "done").length),
    ),
    make("readingsRejected", count(readings.filter((item) => item.status === "rejected").length)),
    make("receipts", count(receipts)),
    make(
      "payments",
      count(payments.filter(({ payment }) => statusOk(paymentGroup(payment.status))).length),
    ),
    make(
      "paymentsSum",
      payments
        .filter(({ payment }) => payment.status === "paid")
        .reduce((sum, { lines }) => sum + lines.reduce((total, line) => total + line.amount, 0), 0),
      "money",
      true,
    ),
    make("appeals", count(appeals.filter((item) => statusOk(appealGroup(item.status))).length)),
    make(
      "deadlines",
      closed.length === 0 ? null : Math.round((onTime / closed.length) * 100),
      "percent",
    ),
    make("integrationErrors", count(errors.length)),
    make(
      "availability",
      systems.length === 0
        ? null
        : Math.round(systems.reduce((sum, item) => sum + item.availability, 0) / systems.length),
      "percent",
    ),
  ];
}

/** The report as a table for a CSV file (spec 17.3): the filter on top, then one line per indicator. */
export function reportRows(
  indicators: readonly Indicator[],
  names: Record<IndicatorId, string>,
  withFinance: boolean,
): string[][] {
  return indicators
    .filter((item) => withFinance || !item.financial)
    .map((item) => [names[item.id], item.value === null ? "" : String(item.value)]);
}

/**
 * One CSV text: values with a comma, a quote or a line break are quoted (RFC 4180). A text that
 * starts like a formula gets a leading apostrophe, so a spreadsheet shows it instead of running it.
 */
export function toCsv(rows: readonly (readonly string[])[]): string {
  const cell = (raw: string) => {
    const value = /^[=+\-@\t\r]/.test(raw) && !/^-\d+(\.\d+)?$/.test(raw) ? `'${raw}` : raw;
    return /[",;\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  };
  return rows.map((row) => row.map(cell).join(";")).join("\r\n") + "\r\n";
}
