import { describe, expect, it } from "vitest";
import {
  canApply,
  changeStatus,
  createApplication,
  nextNumber,
  validateStep,
  type ApplicationForm,
} from "./application";

const form: ApplicationForm = {
  territoryId: "kokshetau",
  address: "ул. Тестовая, 1",
  attached: ["identity"],
  comment: "",
  consent: true,
};

const base = {
  serviceSlug: "gas-contract",
  serviceTitle: "Договор на газ",
  organizationId: "org-1",
  ownerRole: "resident" as const,
  ownerName: "Демо Житель",
  form,
  number: "DEMO-2026-00001",
  now: new Date("2026-10-20T09:00:00Z"),
};

describe("nextNumber", () => {
  it("starts from one and follows the highest number of the year", () => {
    expect(nextNumber([], new Date("2026-10-20T09:00:00Z"))).toBe("DEMO-2026-00001");
    expect(
      nextNumber(
        [
          { number: "DEMO-2026-00007" },
          { number: "DEMO-2026-00003" },
          { number: "DEMO-2025-00099" },
        ],
        new Date("2026-10-20T09:00:00Z"),
      ),
    ).toBe("DEMO-2026-00008");
  });
});

describe("canApply", () => {
  it("matches the role to the audience of the service", () => {
    expect(canApply("resident", "resident")).toBe(true);
    expect(canApply("resident", "business")).toBe(false);
    expect(canApply("business", "both")).toBe(true);
    expect(canApply("operator", "both")).toBe(false);
  });
});

describe("validateStep", () => {
  it("asks for a territory and an address on the object step", () => {
    expect(validateStep("object", { ...form, territoryId: "", address: "" }, ["identity"])).toEqual(
      {
        territoryId: "required",
        address: "required",
      },
    );
    expect(validateStep("object", { ...form, address: "ab" }, ["identity"])).toEqual({
      address: "short",
    });
    expect(validateStep("object", form, ["identity"])).toEqual({});
  });

  it("requires every document to be attached", () => {
    expect(validateStep("documents", { ...form, attached: [] }, ["identity", "account"])).toEqual({
      attached: "missing",
    });
    expect(
      validateStep("documents", { ...form, attached: ["identity", "account"] }, [
        "identity",
        "account",
      ]),
    ).toEqual({});
  });

  it("limits the comment on the review step", () => {
    expect(validateStep("review", { ...form, comment: "x".repeat(301) }, [])).toEqual({
      comment: "long",
    });
  });

  it("needs the consent on the sign step", () => {
    expect(validateStep("sign", { ...form, consent: false }, [])).toEqual({ consent: "required" });
  });
});

describe("createApplication", () => {
  it("makes a submitted application with the first history entry", () => {
    const application = createApplication(base);
    expect(application).toMatchObject({
      number: "DEMO-2026-00001",
      status: "submitted",
      version: 1,
      ownerRole: "resident",
      organizationId: "org-1",
    });
    expect(application.history).toEqual([{ status: "submitted", at: "2026-10-20T09:00:00.000Z" }]);
  });

  it("trims the address and the comment", () => {
    const application = createApplication({
      ...base,
      form: { ...form, address: "  ул. Тестовая, 1 ", comment: " вопрос " },
    });
    expect(application.form.address).toBe("ул. Тестовая, 1");
    expect(application.form.comment).toBe("вопрос");
  });
});

describe("changeStatus", () => {
  const application = createApplication(base);
  const later = new Date("2026-10-21T10:00:00Z");

  it("moves forward, raises the version and adds a history entry", () => {
    const result = changeStatus(application, "in_progress", later, "Принято");
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.application.status).toBe("in_progress");
    expect(result.application.version).toBe(2);
    expect(result.application.history.at(-1)).toEqual({
      status: "in_progress",
      at: "2026-10-21T10:00:00.000Z",
      note: "Принято",
    });
    expect(application.status).toBe("submitted");
  });

  it("refuses a forbidden move without changing anything", () => {
    expect(changeStatus(application, "done", later)).toEqual({ ok: false, reason: "forbidden" });
  });

  it("refuses a change based on an old version", () => {
    expect(changeStatus(application, "in_progress", later, undefined, 0)).toEqual({
      ok: false,
      reason: "stale",
    });
  });
});
