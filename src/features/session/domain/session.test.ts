import { describe, expect, it } from "vitest";
import {
  DEMO_PROFILES,
  operatorSession,
  ownerIdOf,
  parseSession,
  residentSession,
} from "./session";

describe("parseSession", () => {
  it("accepts only the known demo profiles", () => {
    expect(parseSession(JSON.stringify(DEMO_PROFILES.resident))).toEqual(DEMO_PROFILES.resident);
    expect(parseSession(JSON.stringify({ role: "admin", name: "x" }))).toBeNull();
    expect(parseSession("nope")).toBeNull();
    expect(parseSession(JSON.stringify({ role: "operator", name: "Демо Оператор" }))).toBeNull();
    expect(
      parseSession(
        JSON.stringify({ role: "operator", name: "Демо Оператор", organizationId: "<x>" }),
      ),
    ).toBeNull();
    expect(parseSession(null)).toBeNull();
  });

  it("keeps the organization of an operator", () => {
    const session = operatorSession("water-co");
    expect(parseSession(JSON.stringify(session))).toEqual(session);
  });

  it("keeps a registered resident with the id of the profile", () => {
    const session = residentSession("u-1", "Иванов Иван");
    expect(parseSession(JSON.stringify(session))).toEqual(session);
  });

  it("refuses a resident id or name that was edited into nonsense", () => {
    const parse = (value: object) => parseSession(JSON.stringify(value));
    expect(parse({ role: "resident", name: "Иван", userId: "<x>" })).toBeNull();
    expect(parse({ role: "resident", name: " ", userId: "u-1" })).toBeNull();
    expect(parse({ role: "resident", name: "Иван", userId: 5 })).toBeNull();
    expect(parse({ role: "business", name: "Иван", userId: "u-1" })).toBeNull();
  });
});

describe("ownerIdOf", () => {
  it("uses the profile id, or one shared id for each demo role", () => {
    expect(ownerIdOf(residentSession("u-1", "Иванов Иван"))).toBe("u-1");
    expect(ownerIdOf(DEMO_PROFILES.resident)).toBe("demo-resident");
    expect(ownerIdOf(DEMO_PROFILES.business)).toBe("demo-business");
  });
});
