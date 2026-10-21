import { describe, expect, it } from "vitest";
import {
  addressLine,
  canOrderServices,
  createProperty,
  decideVerification,
  requestVerification,
  validateProperty,
  type Property,
  type PropertyInput,
} from "./property";

const TERRITORIES = ["kokshetau", "akkol"];
const now = new Date("2026-10-21T06:00:00Z");
const later = new Date("2026-10-22T06:00:00Z");

const valid: PropertyInput = {
  territoryId: "kokshetau",
  locality: "Кокшетау",
  street: "улица Абая",
  house: "10",
  flat: "5",
  type: "apartment",
  relation: "owner",
  personalAccount: "",
  ownerInfo: "Иванов Иван",
};

const made = () => createProperty(valid, "p-1", "u-1", now);

describe("validateProperty", () => {
  it("accepts a complete form", () => {
    expect(validateProperty(valid, TERRITORIES)).toEqual({});
  });

  it("asks for what is missing", () => {
    const errors = validateProperty(
      {
        ...valid,
        territoryId: "",
        locality: " ",
        street: "",
        house: "",
        type: "",
        relation: "",
        ownerInfo: "",
      },
      TERRITORIES,
    );
    expect(errors).toEqual({
      territoryId: "required",
      locality: "required",
      street: "required",
      house: "required",
      type: "required",
      relation: "required",
      ownerInfo: "required",
    });
  });

  it("refuses a territory that is not in the list", () => {
    expect(validateProperty({ ...valid, territoryId: "mars" }, TERRITORIES).territoryId).toBe(
      "required",
    );
  });

  it("needs a flat for an apartment only", () => {
    expect(validateProperty({ ...valid, flat: "" }, TERRITORIES).flat).toBe("required");
    expect(validateProperty({ ...valid, type: "house", flat: "" }, TERRITORIES)).toEqual({});
  });

  it("accepts house numbers like 12/1, 5а and 7 корпус 2, and refuses nonsense", () => {
    for (const house of ["12/1", "5а", "7 корпус 2", "10-А"]) {
      expect(validateProperty({ ...valid, house }, TERRITORIES).house, house).toBeUndefined();
    }
    for (const house of ["!!", "<b>", "12345678901"]) {
      expect(validateProperty({ ...valid, house }, TERRITORIES).house, house).toBeDefined();
    }
  });

  it("takes a personal account of 6 to 12 digits, with spaces, and refuses letters", () => {
    expect(validateProperty({ ...valid, personalAccount: "123 456 78" }, TERRITORIES)).toEqual({});
    expect(
      validateProperty({ ...valid, personalAccount: "12345" }, TERRITORIES).personalAccount,
    ).toBe("format");
    expect(
      validateProperty({ ...valid, personalAccount: "12ab56" }, TERRITORIES).personalAccount,
    ).toBe("format");
  });

  it("limits the length of place names and the owner", () => {
    const long = "а".repeat(121);
    const errors = validateProperty({ ...valid, street: long, ownerInfo: long }, TERRITORIES);
    expect(errors).toEqual({ street: "long", ownerInfo: "long" });
  });
});

describe("createProperty", () => {
  it("trims the text, drops empty optional fields and starts unverified", () => {
    const property = createProperty(
      { ...valid, street: " улица Абая ", flat: "", personalAccount: "123 456 78" },
      "p-1",
      "u-1",
      now,
    );
    expect(property).toMatchObject({
      id: "p-1",
      ownerId: "u-1",
      street: "улица Абая",
      personalAccount: "12345678",
      version: 1,
      verification: { status: "unverified", documents: [] },
    });
    expect(property).not.toHaveProperty("flat");
    expect(property).not.toHaveProperty("addressId");
  });
});

describe("requestVerification", () => {
  it("confirms at once through the state service", () => {
    const result = requestVerification(made(), { method: "state_integration" }, later);
    expect(result.ok && result.property.verification).toMatchObject({
      status: "confirmed",
      method: "state_integration",
    });
    expect(result.ok && result.property.version).toBe(2);
  });

  it("sends documents to an employee and keeps only name and size", () => {
    const result = requestVerification(
      made(),
      { method: "document", documents: [{ name: "deed.pdf", size: 1000 }] },
      later,
    );
    expect(result.ok && result.property.verification).toMatchObject({
      status: "pending_check",
      method: "document",
      documents: [{ name: "deed.pdf", size: 1000 }],
    });
  });

  it("refuses no documents, too many, and files that are not allowed", () => {
    const send = (documents: { name: string; size: number }[]) =>
      requestVerification(made(), { method: "document", documents }, later);
    expect(send([])).toEqual({ ok: false, reason: "documents" });
    const many = Array.from({ length: 6 }, (_, i) => ({ name: `${i}.pdf`, size: 1 }));
    expect(send(many)).toEqual({ ok: false, reason: "documents" });
    expect(send([{ name: "virus.exe", size: 1 }])).toEqual({ ok: false, reason: "file" });
  });

  it("does not ask again while waiting or after confirmation", () => {
    const waiting = requestVerification(
      made(),
      { method: "document", documents: [{ name: "a.pdf", size: 1 }] },
      later,
    );
    if (!waiting.ok) throw new Error("setup failed");
    expect(requestVerification(waiting.property, { method: "state_integration" }, later)).toEqual({
      ok: false,
      reason: "forbidden",
    });
  });
});

describe("decideVerification", () => {
  const waiting = (): Property => {
    const result = requestVerification(
      made(),
      { method: "document", documents: [{ name: "a.pdf", size: 1 }] },
      later,
    );
    if (!result.ok) throw new Error("setup failed");
    return result.property;
  };

  it("confirms or rejects only what is waiting", () => {
    expect(decideVerification(made(), "confirmed", undefined, later)).toEqual({
      ok: false,
      reason: "forbidden",
    });
    const confirmed = decideVerification(waiting(), "confirmed", undefined, later);
    expect(confirmed.ok && confirmed.property.verification.status).toBe("confirmed");
  });

  it("keeps the reason of a rejection and lets the person try again", () => {
    const rejected = decideVerification(waiting(), "rejected", "Документ не читается", later);
    if (!rejected.ok) throw new Error("rejection failed");
    expect(rejected.property.verification).toMatchObject({
      status: "rejected",
      note: "Документ не читается",
    });
    const again = requestVerification(rejected.property, { method: "state_integration" }, later);
    expect(again.ok).toBe(true);
  });
});

describe("canOrderServices and addressLine", () => {
  it("allows services only for a confirmed object", () => {
    expect(canOrderServices(made())).toBe(false);
    const result = requestVerification(made(), { method: "state_integration" }, later);
    expect(result.ok && canOrderServices(result.property)).toBe(true);
  });

  it("does not repeat the city when the locality is the same", () => {
    expect(addressLine(made(), "Кокшетау", "кв.")).toBe("Кокшетау, улица Абая, 10, кв. 5");
    expect(
      addressLine(
        { ...made(), locality: "Новорыбинка", flat: undefined },
        "Аккольский район",
        "кв.",
      ),
    ).toBe("Аккольский район, Новорыбинка, улица Абая, 10");
  });
});
