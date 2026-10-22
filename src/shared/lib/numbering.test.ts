import { describe, expect, it } from "vitest";
import { nextYearNumber } from "./numbering";

const now = new Date("2026-05-01T00:00:00Z");

describe("nextYearNumber", () => {
  it("starts the year at one", () => {
    expect(nextYearNumber("DEMO-POK", [], now)).toBe("DEMO-POK-2026-00001");
  });

  it("goes after the highest number of its own prefix and year only", () => {
    const existing = [
      "DEMO-POK-2026-00007",
      "DEMO-POK-2025-00090",
      "DEMO-ZPR-2026-00050",
      undefined,
    ];
    expect(nextYearNumber("DEMO-POK", existing, now)).toBe("DEMO-POK-2026-00008");
  });
});
