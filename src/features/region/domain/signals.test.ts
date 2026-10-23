import { describe, expect, it } from "vitest";
import { currencies, ratesFor, weatherFor, weatherKinds } from "./signals";

describe("demo signals", () => {
  it("gives the same weather for the same day and a plausible temperature for the month", () => {
    expect(weatherFor("2026-10-23")).toEqual(weatherFor("2026-10-23"));
    const october = weatherFor("2026-10-23").temperature;
    expect(october).toBeGreaterThanOrEqual(2);
    expect(october).toBeLessThanOrEqual(10);
    expect(weatherFor("2026-01-15").temperature).toBeLessThan(0);
    expect(weatherKinds).toContain(weatherFor("2026-07-01").kind);
  });

  it("never shows rain in frost", () => {
    for (let day = 1; day <= 28; day += 1) {
      const date = `2026-01-${String(day).padStart(2, "0")}`;
      expect(weatherFor(date).kind).not.toBe("rain");
    }
  });

  it("keeps every rate within one percent of its base", () => {
    const rates = ratesFor("2026-10-23");
    expect(Object.keys(rates)).toEqual([...currencies]);
    expect(rates.USD).toBeGreaterThan(443);
    expect(rates.USD).toBeLessThan(453);
    expect(ratesFor("2026-10-24")).not.toEqual(rates);
  });
});
