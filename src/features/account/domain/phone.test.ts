import { describe, expect, it } from "vitest";
import { formatPhone, maskPhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("brings different spellings of one number to +7 and ten digits", () => {
    for (const input of [
      "+7 701 123 45 67",
      "8 (701) 123-45-67",
      "701 123 45 67",
      "77011234567",
      "  +7(701)1234567 ",
    ]) {
      expect(normalizePhone(input), input).toBe("+77011234567");
    }
  });

  it("refuses numbers that cannot be a Kazakhstan mobile", () => {
    for (const input of [
      "",
      "123",
      "+7 201 123 45 67",
      "+7 701 123 4",
      "+7 701 123 45 678",
      "abc",
    ]) {
      expect(normalizePhone(input), input).toBeNull();
    }
  });
});

describe("maskPhone and formatPhone", () => {
  it("hides the middle of the number", () => {
    expect(maskPhone("+77011234567")).toBe("+7 701 ••• •• 67");
  });

  it("does not guess when the number is broken", () => {
    expect(maskPhone("12")).toBe("••••");
    expect(formatPhone("12")).toBe("12");
  });

  it("groups digits for reading", () => {
    expect(formatPhone("+77011234567")).toBe("+7 701 123 45 67");
  });
});
