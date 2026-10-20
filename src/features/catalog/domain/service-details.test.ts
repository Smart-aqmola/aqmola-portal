import { describe, expect, it } from "vitest";
import { documentsFor, stepsFor } from "./service-details";
import type { Service } from "./types";

function service(
  overrides: Partial<Service> = {},
): Pick<Service, "audiences" | "situationId" | "channel"> {
  return { audiences: ["resident"], situationId: "meters", channel: "online", ...overrides };
}

describe("stepsFor", () => {
  it("leads an online service from sign in to the result", () => {
    expect(stepsFor(service())).toEqual(["login", "data", "documents", "review", "sign", "result"]);
  });

  it("adds a visit before the result when a specialist or an office visit is needed", () => {
    const steps = stepsFor(service({ channel: "front-office" }));
    expect(steps).toEqual(["login", "data", "documents", "review", "sign", "visit", "result"]);
  });
});

describe("documentsFor", () => {
  it("asks residents for an identity document", () => {
    expect(documentsFor(service({ situationId: "appeals", audiences: ["resident"] }))).toContain(
      "identity",
    );
  });

  it("asks business for the organization details and the representative's authority", () => {
    const documents = documentsFor(service({ audiences: ["business"], situationId: "business" }));
    expect(documents).toEqual(["organization", "proxy"]);
  });

  it("asks for both when a service is for residents and business", () => {
    const documents = documentsFor(service({ audiences: ["resident", "business"] }));
    expect(documents).toContain("identity");
    expect(documents).toContain("organization");
    expect(documents).not.toContain("proxy");
  });

  it("adds what the life situation needs", () => {
    expect(documentsFor(service({ situationId: "meters" }))).toEqual(["identity", "meterPhoto"]);
    expect(documentsFor(service({ situationId: "connection" }))).toEqual([
      "identity",
      "property",
      "plan",
    ]);
    expect(documentsFor(service({ situationId: "contracts" }))).toEqual(["identity", "account"]);
    expect(documentsFor(service({ situationId: "appeals" }))).toEqual(["identity", "problemPhoto"]);
  });

  it("never lists a document twice", () => {
    const documents = documentsFor(service({ situationId: "construction" }));
    expect(new Set(documents).size).toBe(documents.length);
  });
});
