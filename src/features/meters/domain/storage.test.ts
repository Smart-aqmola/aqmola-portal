import { describe, expect, it } from "vitest";
import { createMeter, emptyMeterInput } from "./meter";
import { createRequest, emptyRequestInput } from "./meter-request";
import { submitReading } from "./reading";
import { parseMeterRequests, parseMeters, parseReadings } from "./storage";

const now = new Date("2026-10-21T06:00:00Z");
const meter = createMeter(
  {
    ...emptyMeterInput(),
    resource: "cold_water",
    type: "mechanical",
    serial: "SN-1",
    installedAt: "2024-05-01",
    initialReading: "100",
  },
  { id: "m-1", ownerId: "o-1", propertyId: "p-1", address: "Кокшетау" },
  now,
);
const reading = (() => {
  const result = submitReading(
    meter,
    [],
    { valueText: "110", readingDate: "2026-10-20", authentic: true, decreaseConfirmed: false },
    { id: "r-1", ownerId: "o-1" },
    now,
  );
  if (!result.ok) throw new Error("reading");
  return result.reading;
})();
const request = createRequest(
  {
    ...emptyRequestInput("fault", "+77011234567"),
    propertyId: "p-1",
    resource: "cold_water",
    meterId: "m-1",
    reason: "no_display",
    details: { faultInfo: "x" },
    slots: [{ date: "2026-10-25", time: "day" }],
  },
  { id: "q-1", ownerId: "o-1", address: "Кокшетау" },
  [],
  now,
);

describe.each([
  ["meters", parseMeters, meter],
  ["readings", parseReadings, reading],
  ["requests", parseMeterRequests, request],
] as const)("%s in storage", (_name, parse, item) => {
  it("reads back what was written", () => {
    expect(parse(JSON.stringify([item]))).toEqual([item]);
  });

  it("gives an empty list for nothing, for broken text and for other shapes", () => {
    expect(parse(null)).toEqual([]);
    expect(parse("{")).toEqual([]);
    expect(parse('{"a":1}')).toEqual([]);
  });

  it("drops an entry with a wrong field and keeps the rest", () => {
    const broken = { ...item, status: "nonsense", state: "nonsense", id: "BAD ID" };
    expect(parse(JSON.stringify([broken, item]))).toEqual([item]);
  });
});

describe("limits", () => {
  it("drops a reading with a number from another system", () => {
    expect(parseReadings(JSON.stringify([{ ...reading, number: "X-1" }]))).toEqual([]);
  });

  it("drops a request with an unknown kind or a bad time of day", () => {
    expect(parseMeterRequests(JSON.stringify([{ ...request, kind: "dig" }]))).toEqual([]);
    expect(
      parseMeterRequests(
        JSON.stringify([{ ...request, slots: [{ date: "2026-10-25", time: "night" }] }]),
      ),
    ).toEqual([]);
  });
});
