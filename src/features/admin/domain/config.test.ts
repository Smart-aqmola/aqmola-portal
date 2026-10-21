import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  changedParameters,
  contractRules,
  parseConfig,
  templateFor,
  type AdminConfig,
} from "./config";

const make = (patch: Partial<AdminConfig>): AdminConfig => ({ ...DEFAULT_CONFIG, ...patch });

describe("parseConfig", () => {
  it("gives the defaults for nothing, broken text and other shapes", () => {
    expect(parseConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(parseConfig("{")).toEqual(DEFAULT_CONFIG);
    expect(parseConfig("[1]")).toEqual(DEFAULT_CONFIG);
    expect(parseConfig("5")).toEqual(DEFAULT_CONFIG);
  });

  it("reads back what was written", () => {
    const config = make({
      blockedOrganizations: ["akmola-gas"],
      staff: [
        {
          id: "s-1",
          organizationId: "akmola-gas",
          name: "Сергеев",
          role: "inspector",
          blocked: false,
        },
      ],
      languages: ["ru", "kk", "en"],
      regulationDays: { service: 3, contract: 12, meter: 7, appeal: 20 },
      financeAccess: false,
      documents: { ...DEFAULT_CONFIG.documents, owner: ["identity"] },
      requiredFields: ["rightSince"],
      templates: { ru: { registered: "Привет" }, kk: { registered: "Сәлем" } },
    });
    expect(parseConfig(JSON.stringify(config))).toEqual(config);
  });

  it("keeps Russian whatever is saved", () => {
    expect(parseConfig(JSON.stringify({ languages: ["kk"] })).languages).toEqual(["ru", "kk"]);
    expect(parseConfig(JSON.stringify({ languages: ["xx"] })).languages).toEqual(["ru"]);
  });

  it("drops what is wrong and keeps the rest: days out of range, unknown documents, bad staff and templates", () => {
    const parsed = parseConfig(
      JSON.stringify({
        regulationDays: { service: 0, contract: 99, meter: 7.5, appeal: 20 },
        documents: { owner: ["identity", "passport"], tenant: "lease" },
        requiredFields: ["email", "shoeSize"],
        staff: [
          { id: "BAD ID", organizationId: "x", name: "A", role: "inspector", blocked: false },
          { id: "s-1", organizationId: "x", name: "", role: "inspector", blocked: false },
          { id: "s-2", organizationId: "x", name: "B", role: "king", blocked: false },
          { id: "s-3", organizationId: "x", name: "C", role: "accountant", blocked: true },
        ],
        templates: { ru: { registered: "ok", nonsense: "x", reading_due: "  " }, kk: "no" },
        blockedOrganizations: ["good-id", "BAD ID", 5],
      }),
    );
    expect(parsed.regulationDays).toEqual({ service: 5, contract: 10, meter: 7, appeal: 20 });
    expect(parsed.documents.owner).toEqual(["identity"]);
    expect(parsed.documents.tenant).toEqual(DEFAULT_CONFIG.documents.tenant);
    expect(parsed.requiredFields).toEqual(["email"]);
    expect(parsed.staff.map((member) => member.id)).toEqual(["s-3"]);
    expect(parsed.templates).toEqual({ ru: { registered: "ok" }, kk: {} });
    expect(parsed.blockedOrganizations).toEqual(["good-id"]);
  });
});

describe("contractRules and templateFor", () => {
  it("hands the form of the application what the administrator set", () => {
    const rules = contractRules(make({ requiredFields: ["email"] }));
    expect(rules.requiredFields).toEqual(["email"]);
    expect(rules.documents.owner).toEqual(["identity", "property"]);
  });

  it("finds a text in Russian and Kazakh only", () => {
    const config = make({ templates: { ru: { registered: "Привет" }, kk: {} } });
    expect(templateFor(config, "ru", "registered")).toBe("Привет");
    expect(templateFor(config, "kk", "registered")).toBeUndefined();
    expect(templateFor(config, "en", "registered")).toBeUndefined();
  });
});

describe("changedParameters (13.4)", () => {
  it("is empty when nothing changed", () => {
    expect(changedParameters(DEFAULT_CONFIG, make({}))).toEqual([]);
  });

  it("names each parameter that changed", () => {
    const after = make({
      blockedOrganizations: ["x"],
      financeAccess: false,
      regulationDays: { ...DEFAULT_CONFIG.regulationDays, appeal: 30 },
      documents: { ...DEFAULT_CONFIG.documents, tenant: ["identity"] },
      templates: { ru: { reading_due: "Пора" }, kk: {} },
    });
    expect(changedParameters(DEFAULT_CONFIG, after).sort()).toEqual(
      [
        "blockedOrganizations",
        "documents.tenant",
        "financeAccess",
        "regulationDays.appeal",
        "templates.ru.reading_due",
      ].sort(),
    );
  });
});
