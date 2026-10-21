import { describe, expect, it } from "vitest";
import { PERIODS_SHOWN } from "../domain/charge";
import type { FeedProvider } from "../domain/repository";
import { stubChargeRepository } from "./stub-charge-repository";

const now = new Date("2026-10-21T06:00:00Z");
const providers: FeedProvider[] = [
  { id: "akmola-grid", name: "Электросети", sector: "electricity" },
  { id: "akmola-water", name: "Водоканал", sector: "water" },
  { id: "akmola-heat", name: "Теплосети", sector: "heat" },
  { id: "akmola-gas", name: "Газ", sector: "gas" },
  { id: "region-eco", name: "Чистая область", sector: "waste" },
];
const list = (propertyId = "p-1") =>
  stubChargeRepository.listForProperty({ propertyId, providers, now });

describe("the stub charges", () => {
  it("makes six months for every provider, ending with this month", () => {
    const charges = list();
    expect(charges).toHaveLength(providers.length * PERIODS_SHOWN);
    const gas = charges.filter((item) => item.providerId === "akmola-gas");
    expect(gas.map((item) => item.period)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });

  it("gives the same amounts every time, and other amounts for another object", () => {
    expect(list()).toEqual(list());
    expect(list("p-2").map((item) => item.accrued)).not.toEqual(list().map((item) => item.accrued));
  });

  it("keeps the arithmetic of every charge: what is due, less what was paid", () => {
    for (const item of list()) {
      const due = item.previousDebt + item.accrued + item.recalculated + item.penalty;
      expect(item.total - item.overpayment, item.id).toBeLessThanOrEqual(due);
      expect(item.total, item.id).toBeGreaterThanOrEqual(0);
      expect(item.overpayment, item.id).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(item.total + item.accrued + item.penalty), item.id).toBe(true);
    }
  });

  it("carries what is not paid into the next month with a small penalty", () => {
    const byProvider = (id: string) => list().filter((item) => item.providerId === id);
    for (const id of providers.map((provider) => provider.id)) {
      const months = byProvider(id);
      months.slice(1).forEach((month, index) => {
        expect(month.previousDebt, `${id} ${month.period}`).toBe(months[index].total);
        if (month.previousDebt > 0) expect(month.penalty).toBeGreaterThan(0);
        else expect(month.penalty).toBe(0);
      });
    }
  });

  it("does not pay the current month yet", () => {
    for (const item of list().filter((entry) => entry.period === "2026-10")) {
      expect(item.paid).toBe(0);
    }
  });

  it("leaves the waste operator silent: old data, no term and no way to pay it (9.8)", () => {
    const waste = list().filter((item) => item.providerId === "region-eco");
    const current = waste[waste.length - 1];
    expect(current.available).toBe(false);
    expect(current.updatedAt.slice(0, 10)).toBe("2026-10-09");
    expect(current.dueAt).toBeUndefined();
    expect(waste.slice(0, -1).every((item) => item.available)).toBe(true);
    expect(list().filter((item) => item.available === false)).toHaveLength(1);
  });

  it("gives an 8-digit account to every provider and a term on the 25th", () => {
    const grid = list().filter((item) => item.providerId === "akmola-grid");
    expect(new Set(grid.map((item) => item.personalAccount)).size).toBe(1);
    expect(grid[0].personalAccount).toMatch(/^\d{8}$/);
    expect(grid[5].dueAt).toBe("2026-10-25");
  });

  it("makes ids from the object, the provider and the month", () => {
    expect(list()[0].id).toBe("p-1:akmola-grid:2026-05");
  });
});
