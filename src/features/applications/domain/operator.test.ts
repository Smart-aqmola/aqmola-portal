import { describe, expect, it } from "vitest";
import { createApplication } from "./application";
import { buildSamples, countByStatus, forOrganization } from "./operator";

const now = new Date("2026-10-20T09:00:00Z");
const form = {
  territoryId: "kokshetau",
  address: "ул. Тестовая, 1",
  attached: [],
  comment: "",
  consent: true,
};
const make = (number: string, organizationId: string) =>
  createApplication({
    serviceSlug: "s",
    serviceTitle: "S",
    organizationId,
    ownerRole: "resident",
    ownerName: "Демо Житель",
    form,
    number,
    now,
  });

describe("forOrganization", () => {
  it("keeps only the applications of that organization", () => {
    const list = [make("DEMO-2026-00001", "a"), make("DEMO-2026-00002", "b")];
    expect(forOrganization(list, "a").map((item) => item.number)).toEqual(["DEMO-2026-00001"]);
  });
});

describe("countByStatus", () => {
  it("counts every status, including empty ones", () => {
    expect(countByStatus([make("DEMO-2026-00001", "a")])).toEqual({
      submitted: 1,
      in_progress: 0,
      done: 0,
      rejected: 0,
    });
  });
});

describe("buildSamples", () => {
  it("makes numbered applications after the existing ones, the second already in work", () => {
    const samples = buildSamples({
      organizationId: "a",
      services: [
        { slug: "one", title: "Один" },
        { slug: "two", title: "Два" },
        { slug: "three", title: "Три" },
      ],
      existing: [make("DEMO-2026-00004", "b")],
      now,
    });
    expect(samples.map((item) => item.number)).toEqual([
      "DEMO-2026-00005",
      "DEMO-2026-00006",
      "DEMO-2026-00007",
    ]);
    expect(samples.map((item) => item.status)).toEqual(["submitted", "in_progress", "submitted"]);
    expect(samples.every((item) => item.organizationId === "a")).toBe(true);
    expect(samples[1].history).toHaveLength(2);
  });

  it("makes nothing when the organization has no services", () => {
    expect(buildSamples({ organizationId: "a", services: [], existing: [], now })).toEqual([]);
  });
});
