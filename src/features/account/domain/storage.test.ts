import { describe, expect, it } from "vitest";
import type { Profile } from "./profile";
import { parseProfiles } from "./storage";

const profile: Profile = {
  id: "u-1",
  lastName: "Иванов",
  firstName: "Иван",
  iin: "900101300123",
  phone: "+77011234567",
  createdAt: "2026-10-21T06:00:00.000Z",
};

describe("parseProfiles", () => {
  it("returns saved profiles", () => {
    expect(parseProfiles(JSON.stringify([profile]))).toEqual([profile]);
  });

  it("returns an empty list for nothing, broken text or the wrong shape", () => {
    expect(parseProfiles(null)).toEqual([]);
    expect(parseProfiles("{oops")).toEqual([]);
    expect(parseProfiles(JSON.stringify({ a: 1 }))).toEqual([]);
  });

  it("drops entries that were edited into nonsense", () => {
    const broken = [
      { ...profile, iin: "123" },
      { ...profile, phone: "8 701 123 45 67" },
      { ...profile, id: "Bad Id" },
      { ...profile, firstName: "" },
      null,
      profile,
    ];
    expect(parseProfiles(JSON.stringify(broken))).toEqual([profile]);
  });
});
