import { describe, expect, it } from "vitest";
import type { ProviderInfo } from "@/features/account/domain/availability";
import { createProperty, type Property } from "@/features/account/domain/property";
import { createAppeal, emptyAppealInput } from "@/features/appeals/domain/appeal";
import type { Charge } from "@/features/billing/domain/charge";
import { createPayment } from "@/features/billing/domain/payment";
import { createDraft, type ContractApplication } from "@/features/contracts/domain/contract";
import { createMeter, emptyMeterInput } from "@/features/meters/domain/meter";
import { createRequest, emptyRequestInput } from "@/features/meters/domain/meter-request";
import { submitReading } from "@/features/meters/domain/reading";
import {
  appealsOf,
  contractsOf,
  orgFromProviders,
  paymentsOf,
  readingsOf,
  requestsOf,
} from "./scope";

const now = new Date("2026-10-21T06:00:00Z");
const providers: ProviderInfo[] = [
  { id: "water-a", name: "Водоканал A", sector: "water", territories: ["kokshetau"] },
  { id: "water-b", name: "Водоканал B", sector: "water", territories: ["atbasar"] },
  { id: "gas", name: "Газ", sector: "gas", territories: "all" },
];
const org = (id: string) => orgFromProviders(id, providers)!;

const property = (id: string, territoryId: string): Property =>
  createProperty(
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
    now,
  );
const properties = [property("p-1", "kokshetau"), property("p-2", "atbasar")];

const meter = (id: string, propertyId: string, resource: "cold_water" | "gas") =>
  createMeter(
    {
      ...emptyMeterInput(),
      resource,
      type: "mechanical",
      serial: id.toUpperCase(),
      installedAt: "2024-05-01",
      initialReading: "10",
    },
    { id, ownerId: "o-1", propertyId, address: "А" },
    now,
  );
const meters = [
  meter("m-1", "p-1", "cold_water"),
  meter("m-2", "p-2", "cold_water"),
  meter("m-3", "p-1", "gas"),
];

describe("orgFromProviders", () => {
  it("finds the organization or says there is none", () => {
    expect(org("gas")).toMatchObject({ id: "gas", name: "Газ", sector: "gas", territories: "all" });
    expect(orgFromProviders("nope", providers)).toBeUndefined();
    expect(orgFromProviders(undefined, providers)).toBeUndefined();
  });
});

describe("what an employee may see (12.3)", () => {
  const contract = (
    id: string,
    providerId: string,
    status: ContractApplication["status"] = "registered",
  ): ContractApplication => ({
    ...createDraft(
      {
        propertyId: "p-1",
        sector: "water",
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
      now,
    ),
    status,
  });

  it("sees the contracts of its provider and no drafts", () => {
    const list = [
      contract("c-1", "gas"),
      contract("c-2", "water-a"),
      contract("c-3", "gas", "draft"),
    ];
    expect(contractsOf(org("gas"), list).map((item) => item.id)).toEqual(["c-1"]);
  });

  it("sees the requests for its utility in its area", () => {
    const request = (
      id: string,
      propertyId: string,
      meterId: string,
      resource: "cold_water" | "gas",
    ) =>
      createRequest(
        {
          ...emptyRequestInput("fault", "+77011234567"),
          propertyId,
          resource,
          meterId,
          reason: "leak",
          details: { faultInfo: "x" },
          slots: [{ date: "2026-10-25", time: "day" }],
        },
        { id, ownerId: "o-1", address: "А" },
        [],
        now,
      );
    const list = [
      request("q-1", "p-1", "m-1", "cold_water"),
      request("q-2", "p-2", "m-2", "cold_water"),
      request("q-3", "p-1", "m-3", "gas"),
    ];
    expect(requestsOf(org("water-a"), list, properties).map((item) => item.id)).toEqual(["q-1"]);
    expect(requestsOf(org("water-b"), list, properties).map((item) => item.id)).toEqual(["q-2"]);
    expect(requestsOf(org("gas"), list, properties).map((item) => item.id)).toEqual(["q-3"]);
    expect(requestsOf(org("gas"), list, [])).toHaveLength(1);
    expect(requestsOf(org("water-a"), list, [])).toEqual([]);
  });

  it("sees the readings of the meters it reads", () => {
    const send = (m: (typeof meters)[number], id: string) => {
      const result = submitReading(
        m,
        [],
        {
          valueText: "20",
          readingDate: "2026-10-20",
          authentic: true,
          decreaseConfirmed: false,
          photo: { name: "a.jpg", size: 5 },
        },
        { id, ownerId: "o-1" },
        now,
      );
      if (!result.ok) throw new Error("setup failed");
      return result.reading;
    };
    const list = [send(meters[0], "r-1"), send(meters[1], "r-2"), send(meters[2], "r-3")];
    expect(readingsOf(org("water-a"), list, meters, properties).map((item) => item.id)).toEqual([
      "r-1",
    ]);
    expect(readingsOf(org("gas"), list, meters, properties).map((item) => item.id)).toEqual([
      "r-3",
    ]);
    expect(readingsOf(org("gas"), list, [], properties)).toEqual([]);
  });

  it("sees the appeals sent to it", () => {
    const make = (id: string, organizationId: string) =>
      createAppeal(
        {
          ...emptyAppealInput("+77011234567"),
          category: "power_cut",
          subcategory: "long_outage",
          address: "Абая, 10",
          description: "Света нет с утра, соседи тоже",
        },
        { id, ownerId: "o-1", organization: { id: organizationId, name: "x" } },
        [],
        now,
      );
    expect(
      appealsOf(org("gas"), [make("a-1", "gas"), make("a-2", "water-a")]).map((item) => item.id),
    ).toEqual(["a-1"]);
  });

  it("sees only its own lines of a payment", () => {
    const charge = (providerId: string, sector: Charge["sector"]): Charge => ({
      id: `p-1:${providerId}:2026-10`,
      propertyId: "p-1",
      providerId,
      providerName: providerId,
      sector,
      personalAccount: "1",
      period: "2026-10",
      previousDebt: 0,
      accrued: 10,
      recalculated: 0,
      penalty: 0,
      paid: 0,
      overpayment: 0,
      total: 10,
      generatedAt: "2026-10-01T06:00:00.000Z",
      updatedAt: "2026-10-05T06:00:00.000Z",
      available: true,
    });
    const payment = createPayment(
      [charge("gas", "gas"), charge("water-a", "water")],
      "gateway",
      { id: "pay-1", ownerId: "o-1", address: "А" },
      [],
      now,
    );
    const found = paymentsOf(org("gas"), [payment]);
    expect(found).toHaveLength(1);
    expect(found[0].lines.map((line) => line.providerId)).toEqual(["gas"]);
    expect(paymentsOf(org("water-b"), [payment])).toEqual([]);
  });
});
