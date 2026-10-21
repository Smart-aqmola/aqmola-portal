import { describe, expect, it } from "vitest";
import {
  createMeter,
  emptyMeterInput,
  isActive,
  parseReading,
  sectorOfResource,
  readingProblem,
  validateMeter,
  withEvent,
  type MeterInput,
} from "./meter";

const today = new Date("2026-10-21T06:00:00Z");

function filled(patch: Partial<MeterInput> = {}): MeterInput {
  return {
    ...emptyMeterInput("12345678"),
    resource: "cold_water",
    type: "mechanical",
    serial: "SN-77",
    installedAt: "2024-05-01",
    initialReading: "120",
    ...patch,
  };
}

describe("parseReading", () => {
  it("takes a comma or a point and spaces inside the number", () => {
    expect(parseReading("1 234,5")).toBe(1234.5);
    expect(parseReading("0012.50")).toBe(12.5);
  });

  it("refuses anything that is not a plain number", () => {
    for (const text of ["", "abc", "-5", "1e3", "12,5,1", "12.", ".5"]) {
      expect(parseReading(text), text).toBeNull();
    }
  });
});

describe("readingProblem", () => {
  const capacity = { digits: 5, decimals: 1 };

  it("names the first thing that is wrong", () => {
    expect(readingProblem("", capacity)).toBe("required");
    expect(readingProblem("-3", capacity)).toBe("negative");
    expect(readingProblem("12a", capacity)).toBe("format");
    expect(readingProblem("123456", capacity)).toBe("digits");
    expect(readingProblem("12,55", capacity)).toBe("decimals");
  });

  it("accepts a number that fits the dials, ignoring leading zeros", () => {
    expect(readingProblem("00123,4", capacity)).toBeNull();
    expect(readingProblem("99999", capacity)).toBeNull();
  });
});

describe("validateMeter", () => {
  it("accepts the minimum the specification asks for", () => {
    expect(validateMeter(filled(), today)).toEqual({});
  });

  it("asks for resource, type, serial number, date of installation and first reading", () => {
    const errors = validateMeter(emptyMeterInput(), today);
    expect(Object.keys(errors).sort()).toEqual(
      ["initialReading", "installedAt", "resource", "serial", "type"].sort(),
    );
  });

  it("refuses dates in the future and a verification that ends before it starts", () => {
    const errors = validateMeter(
      filled({
        installedAt: "2026-10-22",
        lastVerifiedAt: "2026-01-01",
        nextVerificationAt: "2025-01-01",
      }),
      today,
    );
    expect(errors.installedAt).toBe("future");
    expect(errors.nextVerificationAt).toBe("order");
  });

  it("wants a seal number when there is a sealing date", () => {
    expect(validateMeter(filled({ sealedAt: "2025-01-01" }), today).sealNumber).toBe("required");
  });

  it("allows the same serial number again only when the first meter is gone", () => {
    const base = { serial: "sn-77", resource: "cold_water" as const };
    expect(validateMeter(filled(), today, [{ ...base, state: "working" }]).serial).toBe(
      "duplicate",
    );
    expect(validateMeter(filled(), today, [{ ...base, state: "replaced" }]).serial).toBeUndefined();
    expect(
      validateMeter(filled(), today, [{ ...base, resource: "gas", state: "working" }]).serial,
    ).toBeUndefined();
  });

  it("checks the first reading against the capacity chosen in the same form", () => {
    expect(
      validateMeter(filled({ digits: "4", initialReading: "12345" }), today).initialReading,
    ).toBe("digits");
  });

  it("checks the personal account", () => {
    expect(validateMeter(filled({ personalAccount: "12" }), today).personalAccount).toBe("format");
  });
});

describe("createMeter", () => {
  it("writes the first lines of the history in date order", () => {
    const meter = createMeter(
      filled({ sealedAt: "2024-06-01", sealNumber: "P-1", lastVerifiedAt: "2024-04-01" }),
      { id: "m-1", ownerId: "o-1", propertyId: "p-1", address: "Кокшетау, ул. Абая, 1" },
      today,
    );
    expect(meter.history.map((event) => event.kind)).toEqual(["verified", "installed", "sealed"]);
    expect(meter.state).toBe("working");
    expect(meter.initialReading).toBe(120);
  });

  it("will not make a meter without a resource", () => {
    expect(() =>
      createMeter(
        filled({ resource: "" }),
        { id: "m", ownerId: "o", propertyId: "p", address: "" },
        today,
      ),
    ).toThrow();
  });
});

describe("meter state", () => {
  it("counts a faulty meter as active and a replaced one as history", () => {
    expect(isActive({ state: "working" })).toBe(true);
    expect(isActive({ state: "faulty" })).toBe(true);
    expect(isActive({ state: "replaced" })).toBe(false);
    expect(isActive({ state: "removed" })).toBe(false);
  });

  it("keeps the history sorted when a line is added", () => {
    const meter = createMeter(
      filled(),
      { id: "m-1", ownerId: "o-1", propertyId: "p-1", address: "" },
      today,
    );
    const next = withEvent(meter, { kind: "verified", at: "2023-01-01" });
    expect(next.history.map((event) => event.at)).toEqual(["2023-01-01", "2024-05-01"]);
    expect(meter.history).toHaveLength(1);
  });
});

describe("sectorOfResource", () => {
  it("gives both kinds of water to the water supplier and the rest to their own utility", () => {
    expect(sectorOfResource("cold_water")).toBe("water");
    expect(sectorOfResource("hot_water")).toBe("water");
    expect(sectorOfResource("gas")).toBe("gas");
    expect(sectorOfResource("heat")).toBe("heat");
    expect(sectorOfResource("electricity")).toBe("electricity");
  });
});
