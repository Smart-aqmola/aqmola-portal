import { describe, expect, it } from "vitest";
import { createAuditEntry, parseAudit } from "./audit";

const now = new Date("2026-10-21T06:00:00Z");
const entry = createAuditEntry(
  {
    organizationId: "gas",
    actor: "Демо Оператор",
    entity: "contract",
    entityId: "c-1",
    number: "DEMO-DOG-2026-00001",
    action: "status",
    from: "registered",
    to: "under_review",
    note: "  Принято  ",
  },
  "e-1",
  now,
);

describe("createAuditEntry", () => {
  it("writes who, when, what and from what to what, with a clean note", () => {
    expect(entry).toEqual({
      id: "e-1",
      at: "2026-10-21T06:00:00.000Z",
      organizationId: "gas",
      actor: "Демо Оператор",
      entity: "contract",
      entityId: "c-1",
      number: "DEMO-DOG-2026-00001",
      action: "status",
      from: "registered",
      to: "under_review",
      note: "Принято",
    });
  });

  it("leaves out an empty note and an unknown start", () => {
    const bare = createAuditEntry(
      {
        organizationId: "gas",
        actor: "a",
        entity: "appeal",
        entityId: "x",
        number: "N",
        action: "account",
        note: "  ",
      },
      "e-2",
      now,
    );
    expect(Object.keys(bare)).not.toContain("note");
    expect(Object.keys(bare)).not.toContain("from");
  });
});

describe("parseAudit", () => {
  it("reads back what was written", () => {
    expect(parseAudit(JSON.stringify([entry]))).toEqual([entry]);
  });

  it("gives an empty list for nothing, broken text and other shapes", () => {
    expect(parseAudit(null)).toEqual([]);
    expect(parseAudit("{")).toEqual([]);
    expect(parseAudit('{"a":1}')).toEqual([]);
  });

  it("drops a line with a wrong field and keeps the rest", () => {
    const bad = [
      { ...entry, entity: "user" },
      { ...entry, action: "delete" },
      { ...entry, id: "BAD ID" },
      { ...entry, at: 5 },
    ];
    expect(parseAudit(JSON.stringify([...bad, entry]))).toEqual([entry]);
  });
});
