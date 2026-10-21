import { describe, expect, it } from "vitest";
import { isValidIinShape, maskIin } from "./iin";

describe("isValidIinShape", () => {
  it("accepts twelve digits that start with a possible date", () => {
    expect(isValidIinShape("900101300123")).toBe(true);
    expect(isValidIinShape("051231500456")).toBe(true);
  });

  it("refuses wrong length, letters and impossible dates", () => {
    for (const value of ["", "90010130012", "9001013001234", "90010130012a", "901301300123"]) {
      expect(isValidIinShape(value), value).toBe(false);
    }
    expect(isValidIinShape("900100300123")).toBe(false);
    expect(isValidIinShape("900132300123")).toBe(false);
  });
});

describe("maskIin", () => {
  it("keeps the first six and the last two digits", () => {
    expect(maskIin("900101300123")).toBe("900101••••23");
  });

  it("hides everything when the value is not an IIN", () => {
    expect(maskIin("12")).toBe("••••••••••••");
  });
});
