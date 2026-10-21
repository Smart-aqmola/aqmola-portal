import { describe, expect, it } from "vitest";
import { isPayable, periodOf, periodsBack, totalsOf, type Charge } from "./charge";

const charge = (patch: Partial<Charge> = {}): Charge => ({
  id: "p:g:2026-10",
  propertyId: "p",
  providerId: "g",
  providerName: "Газ",
  sector: "gas",
  personalAccount: "12345678",
  period: "2026-10",
  previousDebt: 100,
  accrued: 1000,
  recalculated: -50,
  penalty: 1,
  paid: 0,
  overpayment: 0,
  total: 1051,
  generatedAt: "2026-10-01T06:00:00.000Z",
  updatedAt: "2026-10-21T06:00:00.000Z",
  available: true,
  ...patch,
});

describe("periods", () => {
  it("takes the month of a date in UTC", () => {
    expect(periodOf(new Date("2026-10-31T23:30:00Z"))).toBe("2026-10");
    expect(periodOf(new Date("2027-01-01T00:00:00Z"))).toBe("2027-01");
  });

  it("goes back across the end of a year, newest first", () => {
    expect(periodsBack("2026-02", 4)).toEqual(["2026-02", "2026-01", "2025-12", "2025-11"]);
    expect(periodsBack("2026-10", 1)).toEqual(["2026-10"]);
  });
});

describe("totalsOf", () => {
  it("adds every column over the charges", () => {
    const totals = totalsOf([charge(), charge({ accrued: 500, total: 551, previousDebt: 0 })]);
    expect(totals).toMatchObject({
      previousDebt: 100,
      accrued: 1500,
      total: 1602,
      recalculated: -100,
    });
  });

  it("is all zeros for nothing", () => {
    expect(totalsOf([]).total).toBe(0);
  });
});

describe("isPayable", () => {
  it("needs something to pay and fresh data", () => {
    expect(isPayable(charge())).toBe(true);
    expect(isPayable(charge({ total: 0 }))).toBe(false);
    expect(isPayable(charge({ available: false }))).toBe(false);
  });
});
