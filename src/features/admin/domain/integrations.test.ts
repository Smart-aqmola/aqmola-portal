import { describe, expect, it } from "vitest";
import type { ProviderInfo } from "@/features/account/domain/availability";
import { LOG_DAYS, errorCodes, integrationLog, serviceSystems } from "./integrations";

const now = new Date("2026-10-21T12:00:00Z");
const providers: ProviderInfo[] = [
  { id: "akmola-water", name: "Водоканал", sector: "water", territories: "all" },
  { id: "region-eco", name: "Чистая область", sector: "waste", territories: "all" },
];

describe("integrationLog", () => {
  it("lists every provider and every service system", () => {
    const { systems } = integrationLog(providers, now);
    expect(systems.map((item) => item.id)).toEqual([
      "akmola-water",
      "region-eco",
      ...serviceSystems,
    ]);
    expect(systems[0]).toMatchObject({ kind: "provider", name: "Водоканал" });
    expect(systems[2]).toMatchObject({ kind: "payment_gateway" });
    expect(systems[2].name).toBeUndefined();
  });

  it("is the same for the same day", () => {
    const a = integrationLog(providers, now);
    const b = integrationLog(providers, new Date(now.getTime() + 1000));
    expect(b.systems.map((item) => item.availability)).toEqual(
      a.systems.map((item) => item.availability),
    );
  });

  it("keeps the availability in percent and the status in step with it", () => {
    for (const system of integrationLog(providers, now).systems) {
      expect(system.availability).toBeGreaterThan(0);
      expect(system.availability).toBeLessThanOrEqual(100);
      if (system.availability >= 98) expect(system.status).toBe("available");
      else if (system.availability >= 90) expect(system.status).toBe("degraded");
      else expect(system.status).toBe("unavailable");
    }
  });

  it("keeps the waste operator down, with errors that never got through", () => {
    const { systems, errors } = integrationLog(providers, now);
    expect(systems.find((item) => item.id === "region-eco")).toMatchObject({
      status: "unavailable",
    });
    const waste = errors.filter((item) => item.systemId === "region-eco");
    expect(waste.length).toBeGreaterThanOrEqual(LOG_DAYS * 3 - 3);
    expect(waste.every((item) => !item.retried)).toBe(true);
  });

  it("has errors from the last week only, newest first, with known codes and none in the future", () => {
    const { errors } = integrationLog(providers, now);
    const week = new Date(now.getTime() - LOG_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    for (const error of errors) {
      expect(error.at.slice(0, 10) >= week).toBe(true);
      expect(error.at <= now.toISOString()).toBe(true);
      expect(errorCodes).toContain(error.code);
    }
    expect(errors.map((item) => item.at)).toEqual(
      [...errors.map((item) => item.at)].sort().reverse(),
    );
    expect(new Set(errors.map((item) => item.id)).size).toBe(errors.length);
  });
});
