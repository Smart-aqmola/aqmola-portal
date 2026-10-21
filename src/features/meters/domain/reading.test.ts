import { describe, expect, it } from "vitest";
import { createMeter, emptyMeterInput, type Meter } from "./meter";
import {
  checkReading,
  demoRecognized,
  hasErrors,
  nextReadingNumber,
  previousOf,
  readingProviderChange,
  readingProviderOptions,
  readingStage,
  readingStatuses,
  submitReading,
  type Reading,
  type ReadingDraft,
} from "./reading";

const now = new Date("2026-10-21T06:00:00Z");

function meter(patch: Partial<Meter> = {}): Meter {
  return {
    ...createMeter(
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
    ),
    ...patch,
  };
}

const draft = (patch: Partial<ReadingDraft> = {}): ReadingDraft => ({
  valueText: "110",
  readingDate: "2026-10-20",
  authentic: true,
  decreaseConfirmed: false,
  ...patch,
});

function send(m: Meter, readings: Reading[], d: ReadingDraft, at = now): Reading {
  const result = submitReading(
    m,
    readings,
    d,
    { id: `r-${readings.length + 1}`, ownerId: "o-1" },
    at,
  );
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.reading;
}

describe("previousOf", () => {
  it("starts from the first reading of the meter", () => {
    expect(previousOf(meter(), [])).toEqual({ value: 100, date: "2024-05-01" });
  });

  it("takes the newest reading that was not rejected, even before the provider looked", () => {
    const m = meter();
    const first = send(m, [], draft({ valueText: "110", readingDate: "2026-09-20" }));
    const second = send(m, [first], draft({ valueText: "120", readingDate: "2026-10-10" }));
    const rejected: Reading = { ...second, status: "rejected" };
    expect(previousOf(m, [first, second])).toEqual({ value: 120, date: "2026-10-10" });
    expect(previousOf(m, [first, rejected])).toEqual({ value: 110, date: "2026-09-20" });
  });
});

describe("checkReading", () => {
  it("accepts a normal reading", () => {
    expect(checkReading(meter(), [], draft(), now)).toEqual({});
  });

  it("refuses a meter that is no longer in the home", () => {
    expect(checkReading(meter({ state: "replaced" }), [], draft(), now).meter).toBe("inactive");
  });

  it("checks the number: negative, format, digits", () => {
    expect(checkReading(meter(), [], draft({ valueText: "-1" }), now).value).toBe("negative");
    expect(checkReading(meter(), [], draft({ valueText: "x" }), now).value).toBe("format");
    expect(checkReading(meter(), [], draft({ valueText: "123456" }), now).value).toBe("digits");
  });

  it("checks the date: missing, future, too old, earlier than the previous reading", () => {
    expect(checkReading(meter(), [], draft({ readingDate: "" }), now).date).toBe("required");
    expect(checkReading(meter(), [], draft({ readingDate: "2026-10-22" }), now).date).toBe(
      "future",
    );
    expect(checkReading(meter(), [], draft({ readingDate: "2026-08-01" }), now).date).toBe("old");
    const m = meter();
    const first = send(m, [], draft({ readingDate: "2026-10-15" }));
    expect(
      checkReading(m, [first], draft({ valueText: "111", readingDate: "2026-10-10" }), now).date,
    ).toBe("beforePrevious");
  });

  it("asks what to do when the reading went down, and lets it pass once confirmed", () => {
    expect(checkReading(meter(), [], draft({ valueText: "90" }), now)).toEqual({
      decrease: "confirm",
    });
    expect(
      checkReading(meter(), [], draft({ valueText: "90", decreaseConfirmed: true }), now),
    ).toEqual({});
  });

  it("refuses the same value for the same day twice, but not a rejected one", () => {
    const m = meter();
    const first = send(m, [], draft());
    expect(checkReading(m, [first], draft(), now).value).toBe("duplicate");
    expect(checkReading(m, [{ ...first, status: "rejected" }], draft(), now).value).toBeUndefined();
  });

  it("asks for a photo only where the provider wants it, and only for pictures", () => {
    const gas = meter({ resource: "gas" });
    expect(checkReading(gas, [], draft(), now).photo).toBe("required");
    expect(
      checkReading(gas, [], draft({ photo: { name: "a.jpg", size: 1000 } }), now).photo,
    ).toBeUndefined();
    expect(checkReading(gas, [], draft({ photo: { name: "a.pdf", size: 1000 } }), now).photo).toBe(
      "type",
    );
    expect(
      checkReading(gas, [], draft({ photo: { name: "a.png", size: 9 * 1024 * 1024 } }), now).photo,
    ).toBe("size");
    expect(checkReading(meter(), [], draft(), now).photo).toBeUndefined();
  });

  it("wants the confirmation that the data is true", () => {
    expect(checkReading(meter(), [], draft({ authentic: false }), now).authentic).toBe("required");
  });

  it("tells hasErrors apart from a clean result", () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ value: "format" })).toBe(true);
  });
});

describe("submitReading", () => {
  it("registers a reading with a number and the previous value (7.8, 7.1)", () => {
    const reading = send(meter(), [], draft());
    expect(reading.number).toBe("DEMO-POK-2026-00001");
    expect(reading.status).toBe("registered");
    expect(reading.previousValue).toBe(100);
    expect(reading.history.map((entry) => entry.status)).toEqual(["sent", "registered"]);
  });

  it("sends a lowered reading to a check by the provider (7.7)", () => {
    const reading = send(meter(), [], draft({ valueText: "90", decreaseConfirmed: true }));
    expect(reading.status).toBe("awaiting_check");
  });

  it("returns the errors and makes nothing when the form is wrong", () => {
    const result = submitReading(
      meter(),
      [],
      draft({ valueText: "" }),
      { id: "r", ownerId: "o" },
      now,
    );
    expect(result).toEqual({ ok: false, errors: { value: "required" } });
  });

  it("gives the next number and keeps the file's name and size only", () => {
    const m = meter({ resource: "gas" });
    const first = send(m, [], draft({ photo: { name: "a.jpg", size: 10 } }));
    const second = send(
      m,
      [first],
      draft({ valueText: "120", photo: { name: "b.jpg", size: 20 } }),
    );
    expect(second.number).toBe("DEMO-POK-2026-00002");
    expect(second.photo).toEqual({ name: "b.jpg", size: 20 });
  });
});

describe("nextReadingNumber", () => {
  it("starts again every year", () => {
    expect(nextReadingNumber([{ number: "DEMO-POK-2025-00007" }], now)).toBe("DEMO-POK-2026-00001");
  });
});

describe("provider decisions", () => {
  const start = () => send(meter(), [], draft());

  it("offers only the allowed steps", () => {
    expect(readingProviderOptions("registered")).toContain("accepted");
    expect(readingProviderOptions("processed")).toEqual([]);
    expect(readingProviderOptions("rejected")).toEqual([]);
  });

  it("needs a reason to reject or to ask for more", () => {
    expect(readingProviderChange(start(), "rejected", now)).toEqual({
      ok: false,
      reason: "note_required",
    });
    expect(readingProviderChange(start(), "clarification_required", now, "  ")).toEqual({
      ok: false,
      reason: "note_required",
    });
    const result = readingProviderChange(start(), "rejected", now, "Фото нечёткое");
    expect(result.ok && result.reading.providerNote).toBe("Фото нечёткое");
  });

  it("walks accepted -> passed to the system -> processed and refuses to skip", () => {
    const accepted = readingProviderChange(start(), "accepted", now);
    if (!accepted.ok) throw new Error("accepted");
    expect(readingProviderChange(accepted.reading, "processed", now)).toEqual({
      ok: false,
      reason: "not_allowed",
    });
    const passed = readingProviderChange(accepted.reading, "passed_to_system", now);
    if (!passed.ok) throw new Error("passed");
    const done = readingProviderChange(passed.reading, "processed", now);
    expect(done.ok && done.reading.history.map((entry) => entry.status)).toEqual([
      "sent",
      "registered",
      "accepted",
      "passed_to_system",
      "processed",
    ]);
  });
});

describe("readingStage", () => {
  it("tells sent from counted (7.12)", () => {
    expect(readingStage("registered")).toBe("waiting");
    expect(readingStage("accepted")).toBe("accepted");
    expect(readingStage("passed_to_system")).toBe("accepted");
    expect(readingStage("processed")).toBe("counted");
    expect(readingStage("rejected")).toBe("problem");
    for (const status of readingStatuses) expect(readingStage(status)).toBeTruthy();
  });
});

describe("demoRecognized", () => {
  it("writes the faked value with the capacity of the meter", () => {
    expect(demoRecognized(100, 0)).toBe("113");
    expect(demoRecognized(100, 1)).toBe("112,5");
  });
});
