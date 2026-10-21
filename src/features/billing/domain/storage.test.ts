import { describe, expect, it } from "vitest";
import { createPayment } from "./payment";
import { parsePayments } from "./storage";

const made = createPayment(
  [
    {
      id: "p-1:g:2026-10",
      propertyId: "p-1",
      providerId: "g",
      providerName: "Газ",
      sector: "gas",
      personalAccount: "12345678",
      period: "2026-10",
      previousDebt: 0,
      accrued: 1000,
      recalculated: 0,
      penalty: 0,
      paid: 0,
      overpayment: 0,
      total: 1000,
      generatedAt: "2026-10-01T06:00:00.000Z",
      updatedAt: "2026-10-21T06:00:00.000Z",
      available: true,
    },
  ],
  "reference",
  { id: "pay-1", ownerId: "o-1", address: "Кокшетау" },
  [],
  new Date("2026-10-21T06:00:00Z"),
);

describe("parsePayments", () => {
  it("reads back what was written", () => {
    expect(parsePayments(JSON.stringify([made]))).toEqual([made]);
  });

  it("gives an empty list for nothing, broken text and other shapes", () => {
    expect(parsePayments(null)).toEqual([]);
    expect(parsePayments("{")).toEqual([]);
    expect(parsePayments('{"a":1}')).toEqual([]);
  });

  it("drops a payment with a wrong field and keeps the rest", () => {
    const broken = [
      { ...made, status: "nonsense" },
      { ...made, number: "X-1" },
      { ...made, lines: [] },
      { ...made, total: 1.5 },
      { ...made, method: "cash" },
      { ...made, id: "BAD ID" },
    ];
    expect(parsePayments(JSON.stringify([...broken, made]))).toEqual([made]);
  });
});
