import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("groups thousands with a no-break space and adds the tenge sign", () => {
    expect(formatMoney(0)).toBe("0 ₸");
    expect(formatMoney(950)).toBe("950 ₸");
    expect(formatMoney(12345)).toBe("12 345 ₸");
    expect(formatMoney(1234567)).toBe("1 234 567 ₸");
  });

  it("keeps a minus sign in front", () => {
    expect(formatMoney(-1500)).toBe("-1 500 ₸");
  });
});
