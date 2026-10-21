import { describe, expect, it } from "vitest";
import {
  createProfile,
  displayName,
  findByPhone,
  validateRegistration,
  type Profile,
  type RegistrationInput,
} from "./profile";

const valid: RegistrationInput = {
  lastName: "Иванов",
  firstName: "Иван",
  middleName: "",
  iin: "900101300123",
  phone: "+7 701 123 45 67",
  email: "",
  consent: true,
};

const now = new Date("2026-10-21T06:00:00Z");

describe("validateRegistration", () => {
  it("accepts a complete form without a middle name or email", () => {
    expect(validateRegistration(valid, [])).toEqual({});
  });

  it("asks for the required fields", () => {
    const errors = validateRegistration(
      { ...valid, lastName: " ", firstName: "", iin: "", phone: "", consent: false },
      [],
    );
    expect(errors).toEqual({
      lastName: "required",
      firstName: "required",
      iin: "required",
      phone: "required",
      consent: "required",
    });
  });

  it("refuses digits in names, a short IIN, a foreign phone and a broken email", () => {
    const errors = validateRegistration(
      { ...valid, lastName: "Ivan0v", iin: "123", phone: "12345", email: "no-at" },
      [],
    );
    expect(errors).toEqual({
      lastName: "format",
      iin: "format",
      phone: "format",
      email: "format",
    });
  });

  it("allows double names and apostrophes", () => {
    expect(
      validateRegistration({ ...valid, lastName: "Омар-Хан", firstName: "Д'Артаньян" }, []),
    ).toEqual({});
  });

  it("does not register the same IIN or phone twice", () => {
    const existing = [createProfile(valid, "u-1", now)];
    const errors = validateRegistration({ ...valid, phone: "8 701 123 45 67" }, existing);
    expect(errors).toEqual({ iin: "taken", phone: "taken" });
  });

  it("limits the length of names and email", () => {
    const long = "а".repeat(61);
    const errors = validateRegistration(
      { ...valid, firstName: long, email: `${"a".repeat(100)}@mail.kz` },
      [],
    );
    expect(errors).toEqual({ firstName: "long", email: "long" });
  });
});

describe("createProfile", () => {
  it("trims the text and stores the phone in one form", () => {
    const profile = createProfile(
      { ...valid, lastName: " Иванов ", middleName: " Иванович ", email: " a@b.kz " },
      "u-1",
      now,
    );
    expect(profile).toEqual({
      id: "u-1",
      lastName: "Иванов",
      firstName: "Иван",
      middleName: "Иванович",
      iin: "900101300123",
      phone: "+77011234567",
      email: "a@b.kz",
      createdAt: "2026-10-21T06:00:00.000Z",
    });
  });

  it("leaves out the fields that were not filled", () => {
    const profile = createProfile(valid, "u-1", now);
    expect(profile).not.toHaveProperty("middleName");
    expect(profile).not.toHaveProperty("email");
  });
});

describe("displayName and findByPhone", () => {
  const profiles: Profile[] = [createProfile(valid, "u-1", now)];

  it("names a person by last and first name", () => {
    expect(displayName(profiles[0])).toBe("Иванов Иван");
  });

  it("finds the person however the number is typed", () => {
    expect(findByPhone(profiles, "8 (701) 123-45-67")?.id).toBe("u-1");
  });

  it("returns nothing for an unknown or broken number", () => {
    expect(findByPhone(profiles, "+7 702 000 00 00")).toBeNull();
    expect(findByPhone(profiles, "abc")).toBeNull();
  });
});
