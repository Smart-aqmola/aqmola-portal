import { describe, expect, it } from "vitest";
import {
  REGULATION_DAYS,
  countStates,
  dueDate,
  filterItems,
  isOverdue,
  type RegistryItem,
} from "./registry";

function item(id: string, patch: Partial<RegistryItem> = {}): RegistryItem {
  return {
    id,
    kind: "service",
    number: `DEMO-2026-0000${id}`,
    at: "2026-10-01T06:00:00.000Z",
    title: "Подключение к газу",
    address: "Кокшетау, улица Абая, 10",
    organization: "Газ Акмола",
    description: "",
    status: "Подана",
    tone: "new",
    closed: false,
    needsAction: false,
    filesCount: 0,
    href: `/ru/applications/${id}`,
    ...patch,
  };
}

describe("dueDate", () => {
  it("adds the days of the regulation of the kind", () => {
    expect(dueDate(item("1"))).toBe("2026-10-06");
    expect(dueDate(item("1", { kind: "contract" }))).toBe("2026-10-11");
    expect(dueDate(item("1", { kind: "appeal" }))).toBe("2026-10-16");
    expect(REGULATION_DAYS.meter).toBe(7);
  });
});

describe("isOverdue", () => {
  const now = new Date("2026-10-10T06:00:00Z");

  it("is late when the day has passed and the request is still open", () => {
    expect(isOverdue(item("1"), now)).toBe(true);
    expect(isOverdue(item("1", { kind: "contract" }), now)).toBe(false);
  });

  it("is never late once the request is closed", () => {
    expect(isOverdue(item("1", { closed: true }), now)).toBe(false);
  });
});

describe("filterItems", () => {
  const items = [
    item("1", { at: "2026-10-01T06:00:00.000Z" }),
    item("2", {
      kind: "contract",
      at: "2026-10-03T06:00:00.000Z",
      needsAction: true,
      title: "Договор на воду",
    }),
    item("3", {
      kind: "meter",
      at: "2026-10-02T06:00:00.000Z",
      closed: true,
      address: "Акколь, Ёлочная, 3",
    }),
  ];
  const all = { kind: "", state: "", query: "" } as const;

  it("puts the newest first", () => {
    expect(filterItems(items, all).map((entry) => entry.id)).toEqual(["2", "3", "1"]);
  });

  it("filters by kind and by state", () => {
    expect(filterItems(items, { ...all, kind: "meter" }).map((entry) => entry.id)).toEqual(["3"]);
    expect(filterItems(items, { ...all, state: "open" }).map((entry) => entry.id)).toEqual([
      "2",
      "1",
    ]);
    expect(filterItems(items, { ...all, state: "action" }).map((entry) => entry.id)).toEqual(["2"]);
    expect(filterItems(items, { ...all, state: "archive" }).map((entry) => entry.id)).toEqual([
      "3",
    ]);
  });

  it("looks for a part of the number, the title or the address, in any case, with е for ё", () => {
    expect(filterItems(items, { ...all, query: "00002" }).map((entry) => entry.id)).toEqual(["2"]);
    expect(filterItems(items, { ...all, query: "ДОГОВОР" }).map((entry) => entry.id)).toEqual([
      "2",
    ]);
    expect(filterItems(items, { ...all, query: "елочная" }).map((entry) => entry.id)).toEqual([
      "3",
    ]);
  });

  it("copes with a request that has no number yet", () => {
    const draft = [item("4", { number: undefined })];
    expect(filterItems(draft, { ...all, query: "DEMO" })).toEqual([]);
    expect(filterItems(draft, all)).toHaveLength(1);
  });
});

describe("countStates", () => {
  it("counts open, waiting for the person, and archived", () => {
    const counted = countStates([
      item("1"),
      item("2", { needsAction: true }),
      item("3", { closed: true }),
    ]);
    expect(counted).toEqual({ open: 2, action: 1, archive: 1 });
  });
});
