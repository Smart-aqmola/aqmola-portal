import { describe, expect, it } from "vitest";
import { formatDate } from "./format-date";

describe("formatDate", () => {
  it("writes the day and the month name in the language of the visitor", () => {
    expect(formatDate("2026-10-18", "ru")).toBe("18 октября");
    expect(formatDate("2026-10-18", "en")).toMatch(/October 18|18 October/);
    expect(formatDate("2026-10-18", "kk")).toContain("18");
  });

  it("does not shift the day because of the time zone", () => {
    expect(formatDate("2026-01-01", "ru")).toBe("1 января");
    expect(formatDate("2026-12-31", "ru")).toBe("31 декабря");
  });
});
