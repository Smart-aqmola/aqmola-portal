import { describe, expect, it } from "vitest";
import { createProperty, requestVerification } from "./property";
import type { Profile } from "./profile";
import { parseProfiles, parseProperties } from "./storage";

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

const property = createProperty(
  {
    territoryId: "kokshetau",
    locality: "Кокшетау",
    street: "улица Абая",
    house: "10",
    flat: "5",
    type: "apartment",
    relation: "owner",
    personalAccount: "",
    ownerInfo: "Иванов Иван",
    addressId: "kokshetau-abay",
  },
  "p-1",
  "u-1",
  new Date("2026-10-21T06:00:00Z"),
);

describe("parseProperties", () => {
  it("returns saved objects, including one waiting for documents", () => {
    const waiting = requestVerification(
      property,
      { method: "document", documents: [{ name: "deed.pdf", size: 1000 }] },
      new Date("2026-10-22T06:00:00Z"),
    );
    if (!waiting.ok) throw new Error("setup failed");
    expect(parseProperties(JSON.stringify([property, waiting.property]))).toEqual([
      property,
      waiting.property,
    ]);
  });

  it("returns an empty list for nothing, broken text or the wrong shape", () => {
    expect(parseProperties(null)).toEqual([]);
    expect(parseProperties("{oops")).toEqual([]);
    expect(parseProperties(JSON.stringify("x"))).toEqual([]);
  });

  it("drops objects that were edited into nonsense", () => {
    const broken = [
      { ...property, type: "castle" },
      { ...property, relation: "king" },
      { ...property, id: "Bad Id" },
      { ...property, house: "x".repeat(40) },
      { ...property, personalAccount: "abc" },
      { ...property, verification: { status: "done", documents: [] } },
      { ...property, verification: { status: "pending_check", documents: [{ name: 5, size: 1 }] } },
      null,
      property,
    ];
    expect(parseProperties(JSON.stringify(broken))).toEqual([property]);
  });
});
