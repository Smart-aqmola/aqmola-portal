import { describe, expect, it } from "vitest";
import { createApplication } from "./application";
import { parseApplications } from "./storage";

const application = createApplication({
  serviceSlug: "gas-contract",
  serviceTitle: "Договор на газ",
  organizationId: "org-1",
  ownerRole: "resident",
  ownerName: "Демо Житель",
  form: {
    territoryId: "kokshetau",
    address: "ул. Тестовая, 1",
    attached: [],
    comment: "",
    consent: true,
  },
  number: "DEMO-2026-00001",
  now: new Date("2026-10-20T09:00:00Z"),
});

describe("parseApplications", () => {
  it("reads back what was saved", () => {
    expect(parseApplications(JSON.stringify([application]))).toEqual([application]);
  });

  it("ignores broken text, wrong shapes and unknown statuses", () => {
    expect(parseApplications(null)).toEqual([]);
    expect(parseApplications("{oops")).toEqual([]);
    expect(parseApplications('{"a":1}')).toEqual([]);
    expect(
      parseApplications(JSON.stringify([{ ...application, status: "hacked" }, 5, null])),
    ).toEqual([]);
  });

  it("drops entries that do not look like a demo number", () => {
    expect(parseApplications(JSON.stringify([{ ...application, number: "<b>1</b>" }]))).toEqual([]);
  });
});
