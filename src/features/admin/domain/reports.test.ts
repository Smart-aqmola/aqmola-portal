import { describe, expect, it } from "vitest";
import type { ProviderInfo } from "@/features/account/domain/availability";
import {
  createProperty,
  requestVerification,
  type Property,
} from "@/features/account/domain/property";
import { createAppeal, emptyAppealInput, executorStep } from "@/features/appeals/domain/appeal";
import type { Charge } from "@/features/billing/domain/charge";
import { createPayment, type Payment } from "@/features/billing/domain/payment";
import { createDraft, type ContractApplication } from "@/features/contracts/domain/contract";
import { createMeter, emptyMeterInput } from "@/features/meters/domain/meter";
import { createRequest, emptyRequestInput } from "@/features/meters/domain/meter-request";
import { submitReading } from "@/features/meters/domain/reading";
import type { IntegrationError, IntegrationSystem } from "./integrations";
import {
  buildReport,
  emptyFilter,
  indicatorIds,
  reportRows,
  toCsv,
  type IndicatorId,
  type ReportFilter,
  type ReportSources,
} from "./reports";

const now = new Date("2026-10-21T06:00:00Z");
const day = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
const providers: ProviderInfo[] = [
  { id: "water-k", name: "Водоканал К", sector: "water", territories: ["kokshetau"] },
  { id: "gas", name: "Газ", sector: "gas", territories: "all" },
];

function property(id: string, territoryId: string, confirmed = true, at = day(10)): Property {
  const made = createProperty(
    {
      territoryId,
      locality: "Н",
      street: "ул",
      house: "1",
      flat: "",
      type: "house",
      relation: "owner",
      personalAccount: "",
      ownerInfo: "И",
    },
    id,
    "o-1",
    at,
  );
  if (!confirmed) return made;
  const result = requestVerification(made, { method: "state_integration" }, at);
  if (!result.ok) throw new Error("setup failed");
  return result.property;
}

const contract = (
  id: string,
  providerId: string,
  status: ContractApplication["status"],
  at: Date,
  propertyId = "p-1",
  sector: ContractApplication["sector"] = "water",
): ContractApplication => ({
  ...createDraft(
    {
      propertyId,
      sector,
      serviceSlug: "s",
      serviceTitle: "t",
      providerId,
      providerName: "x",
      applicant: {
        lastName: "И",
        firstName: "И",
        middleName: "",
        iin: "900101300123",
        phone: "+77011234567",
        email: "",
      },
      address: "А",
      propertyType: "house",
      basis: "owner",
      personalAccount: "",
    },
    id,
    "o-1",
    at,
  ),
  status,
  submittedAt: at.toISOString(),
  updatedAt: at.toISOString(),
});

const meter = createMeter(
  {
    ...emptyMeterInput(),
    resource: "cold_water",
    type: "mechanical",
    serial: "S1",
    installedAt: "2024-05-01",
    initialReading: "10",
  },
  { id: "m-1", ownerId: "o-1", propertyId: "p-1", address: "А" },
  day(30),
);

const sources: ReportSources = (() => {
  const accepted = submitReading(
    meter,
    [],
    { valueText: "20", readingDate: "2026-10-15", authentic: true, decreaseConfirmed: false },
    { id: "r-1", ownerId: "o-1" },
    day(5),
  );
  const rejected = submitReading(
    meter,
    [],
    { valueText: "30", readingDate: "2026-10-16", authentic: true, decreaseConfirmed: false },
    { id: "r-2", ownerId: "o-1" },
    day(4),
  );
  if (!accepted.ok || !rejected.ok) throw new Error("setup failed");
  const charge = (providerId: string, sector: Charge["sector"], total: number): Charge => ({
    id: `p-1:${providerId}:2026-10`,
    propertyId: "p-1",
    providerId,
    providerName: providerId,
    sector,
    personalAccount: "1",
    period: "2026-10",
    previousDebt: 0,
    accrued: total,
    recalculated: 0,
    penalty: 0,
    paid: 0,
    overpayment: 0,
    total,
    generatedAt: "2026-10-01T06:00:00.000Z",
    updatedAt: "2026-10-05T06:00:00.000Z",
    available: true,
  });
  const paid: Payment = {
    ...createPayment(
      [charge("water-k", "water", 4000), charge("gas", "gas", 6000)],
      "gateway",
      { id: "pay-1", ownerId: "o-1", address: "А" },
      [],
      day(3),
    ),
    status: "paid",
  };
  const appeal = (
    id: string,
    organizationId: string,
    steps: Parameters<typeof executorStep>[1][],
    at: Date,
  ) => {
    let current = createAppeal(
      {
        ...emptyAppealInput("+77011234567"),
        category: "water_cut",
        subcategory: "no_water",
        address: "Абая, 10",
        description: "Воды нет с утра, соседи тоже",
        propertyId: "p-1",
      },
      { id, ownerId: "o-1", organization: { id: organizationId, name: "x" } },
      [],
      at,
    );
    for (const to of steps) {
      const step = executorStep(current, to, "текст", new Date(at.getTime() + 24 * 60 * 60 * 1000));
      if (!step.ok) throw new Error("setup failed");
      current = step.appeal;
    }
    return current;
  };
  const request = (id: string, status: "registered" | "done") => ({
    ...createRequest(
      {
        ...emptyRequestInput("fault", "+77011234567"),
        propertyId: "p-1",
        resource: "cold_water",
        meterId: "m-1",
        reason: "leak",
        details: { faultInfo: "x" },
        slots: [{ date: "2026-10-25", time: "day" }],
      },
      { id, ownerId: "o-1", address: "А" },
      [],
      day(9),
    ),
    status,
    updatedAt: (status === "done" ? day(8) : day(9)).toISOString(),
  });
  const systems: IntegrationSystem[] = [
    {
      id: "water-k",
      kind: "provider",
      name: "Водоканал К",
      availability: 100,
      status: "available",
      checkedAt: now.toISOString(),
    },
    {
      id: "gas",
      kind: "provider",
      name: "Газ",
      availability: 90,
      status: "degraded",
      checkedAt: now.toISOString(),
    },
    { id: "ecp", kind: "ecp", availability: 98, status: "available", checkedAt: now.toISOString() },
  ];
  const errors: IntegrationError[] = [
    { id: "e1", at: day(2).toISOString(), systemId: "gas", code: "timeout", retried: true },
    { id: "e2", at: day(1).toISOString(), systemId: "ecp", code: "bad_response", retried: false },
    { id: "e3", at: day(30).toISOString(), systemId: "water-k", code: "timeout", retried: true },
  ];
  return {
    profiles: [
      { createdAt: day(40).toISOString() },
      { createdAt: day(5).toISOString() },
      { createdAt: day(1).toISOString() },
    ],
    properties: [property("p-1", "kokshetau"), property("p-2", "atbasar", false, day(2))],
    providers,
    applications: [],
    contracts: [
      contract("c-1", "water-k", "concluded", day(20)),
      contract("c-2", "water-k", "under_review", day(10)),
      contract("c-3", "gas", "refused", day(6), "p-2", "gas"),
      contract("c-4", "gas", "draft", day(3), "p-2", "gas"),
    ],
    meters: [meter],
    readings: [accepted.reading, { ...rejected.reading, status: "rejected" }],
    requests: [request("q-1", "registered"), request("q-2", "done")],
    payments: [paid],
    appeals: [
      appeal("a-1", "water-k", ["accepted", "in_review", "answer_ready", "executed"], day(12)),
      appeal("a-2", "gas", [], day(2)),
    ],
    systems,
    errors,
  };
})();

const report = (filter: Partial<ReportFilter> = {}) =>
  Object.fromEntries(
    buildReport(sources, { ...emptyFilter, ...filter }, now).map((item) => [item.id, item.value]),
  ) as Record<IndicatorId, number | null>;

describe("buildReport: the eighteen indicators (17.1)", () => {
  it("has them all in the order of the specification", () => {
    expect(buildReport(sources, emptyFilter, now).map((item) => item.id)).toEqual([
      ...indicatorIds,
    ]);
  });

  it("counts everything with no filter", () => {
    expect(report()).toEqual({
      users: 3,
      properties: 2,
      providers: 2,
      contractApplications: 3,
      contractsConcluded: 1,
      underReview: 1,
      refused: 1,
      meterRequests: 2,
      readingsSent: 2,
      readingsAccepted: 0,
      readingsRejected: 1,
      receipts: 6,
      payments: 1,
      paymentsSum: 10000,
      appeals: 2,
      deadlines: 100,
      integrationErrors: 3,
      availability: 96,
    });
  });
});

describe("buildReport: filters (17.2)", () => {
  it("limits by period", () => {
    const week = { from: day(7).toISOString().slice(0, 10) };
    const found = report(week);
    expect(found.users).toBe(2);
    expect(found.contractApplications).toBe(1);
    expect(found.integrationErrors).toBe(2);
    expect(found.meterRequests).toBe(0);
    expect(report({ to: day(8).toISOString().slice(0, 10) }).users).toBe(1);
  });

  it("limits by territory", () => {
    const found = report({ territoryId: "kokshetau" });
    expect(found).toMatchObject({
      properties: 1,
      providers: 2,
      contractApplications: 2,
      meterRequests: 2,
      appeals: 2,
    });
    expect(report({ territoryId: "atbasar" })).toMatchObject({
      properties: 1,
      providers: 1,
      contractApplications: 1,
      meterRequests: 0,
    });
  });

  it("limits by organization and by utility", () => {
    expect(report({ organizationId: "gas" })).toMatchObject({
      providers: 1,
      contractApplications: 1,
      appeals: 1,
      paymentsSum: 6000,
      meterRequests: 0,
    });
    expect(report({ organizationId: "water-k" })).toMatchObject({
      contractApplications: 2,
      meterRequests: 2,
      readingsSent: 2,
      paymentsSum: 4000,
    });
    expect(report({ sector: "gas" })).toMatchObject({
      providers: 1,
      contractApplications: 1,
      paymentsSum: 6000,
      meterRequests: 0,
    });
  });

  it("limits the totals by status but not the indicators that are about one status", () => {
    const refused = report({ status: "refused" });
    expect(refused.contractApplications).toBe(1);
    expect(refused.readingsSent).toBe(1);
    expect(refused.contractsConcluded).toBe(1);
    expect(refused.refused).toBe(1);
    expect(report({ status: "done" }).meterRequests).toBe(1);
    expect(report({ status: "open" }).appeals).toBe(1);
  });
});

describe("buildReport: the other numbers", () => {
  it("counts a receipt for each confirmed object and month in the range", () => {
    expect(report().receipts).toBe(6);
    expect(report({ from: "2026-10-01" }).receipts).toBe(1);
    expect(report({ territoryId: "atbasar" }).receipts).toBe(0);
  });

  it("measures the share of requests closed within their term, and has nothing to say when none is closed", () => {
    expect(report().deadlines).toBe(100);
    const slow = buildReport(
      {
        ...sources,
        requests: [{ ...sources.requests[1], updatedAt: day(-30).toISOString() }],
        contracts: [],
        appeals: [],
      },
      emptyFilter,
      now,
    );
    expect(slow.find((item) => item.id === "deadlines")?.value).toBe(0);
    const none = buildReport(
      { ...sources, requests: [], contracts: [], appeals: [], applications: [] },
      emptyFilter,
      now,
    );
    expect(none.find((item) => item.id === "deadlines")?.value).toBeNull();
  });

  it("takes the longer terms the administrator set", () => {
    const tight = buildReport(sources, emptyFilter, now, {
      service: 1,
      contract: 1,
      meter: 0,
      appeal: 0,
    });
    // Two contracts closed on the day they came in are still on time, the request and the appeal are late.
    expect(tight.find((item) => item.id === "deadlines")?.value).toBe(50);
  });

  it("has no availability when there are no systems", () => {
    expect(
      buildReport({ ...sources, systems: [] }, emptyFilter, now).find(
        (item) => item.id === "availability",
      )?.value,
    ).toBeNull();
  });

  it("marks the money as financial", () => {
    expect(
      buildReport(sources, emptyFilter, now)
        .filter((item) => item.financial)
        .map((item) => item.id),
    ).toEqual(["paymentsSum"]);
  });
});

describe("export (17.3, 17.4)", () => {
  const names = Object.fromEntries(indicatorIds.map((id) => [id, `n:${id}`])) as Record<
    IndicatorId,
    string
  >;
  const indicators = buildReport(sources, emptyFilter, now);

  it("leaves out the financial lines for someone who may not see them", () => {
    expect(reportRows(indicators, names, true)).toHaveLength(indicatorIds.length);
    const without = reportRows(indicators, names, false);
    expect(without).toHaveLength(indicatorIds.length - 1);
    expect(without.flat()).not.toContain("n:paymentsSum");
  });

  it("writes an empty cell for a number that does not exist", () => {
    const rows = reportRows(
      buildReport({ ...sources, systems: [] }, emptyFilter, now),
      names,
      true,
    );
    expect(rows.find((row) => row[0] === "n:availability")).toEqual(["n:availability", ""]);
  });

  it("makes a CSV that opens in a spreadsheet: semicolons, quotes doubled, a line break after each row", () => {
    expect(
      toCsv([
        ["a", "b;c"],
        ['d"e', "f\ng"],
      ]),
    ).toBe('a;"b;c"\r\n"d""e";"f\ng"\r\n');
  });

  it("keeps a spreadsheet from running a cell as a formula, but leaves numbers alone", () => {
    expect(toCsv([["=HYPERLINK(1)", "+1", "@x", "-5", "-1.5", "-x"]])).toBe(
      "'=HYPERLINK(1);'+1;'@x;-5;-1.5;'-x\r\n",
    );
  });
});
