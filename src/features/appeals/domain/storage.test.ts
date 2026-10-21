import { describe, expect, it } from "vitest";
import { createAppeal, emptyAppealInput } from "./appeal";
import { parseAppeals } from "./storage";

const made = createAppeal(
  {
    ...emptyAppealInput("+77011234567"),
    category: "power_cut",
    subcategory: "long_outage",
    address: "Кокшетау, улица Абая, 10",
    description: "Света нет с утра, соседи тоже без света",
    violationDate: "2026-10-20",
    violationTime: "08:30",
    duration: "5",
  },
  { id: "a-1", ownerId: "o-1", organization: { id: "region-office", name: "Управление ЖКХ" } },
  [],
  new Date("2026-10-21T06:00:00Z"),
);

describe("parseAppeals", () => {
  it("reads back what was written, with the violation and the electronic number", () => {
    expect(parseAppeals(JSON.stringify([made]))).toEqual([made]);
    expect(made.external?.number).toBe("ЭО-2026-00001");
  });

  it("gives an empty list for nothing, broken text and other shapes", () => {
    expect(parseAppeals(null)).toEqual([]);
    expect(parseAppeals("{")).toEqual([]);
    expect(parseAppeals('{"a":1}')).toEqual([]);
  });

  it("drops an appeal with a wrong field and keeps the rest", () => {
    const broken = [
      { ...made, status: "nonsense" },
      { ...made, number: "X-1" },
      { ...made, category: "dig" },
      { ...made, subcategory: "unknown" },
      { ...made, id: "BAD ID" },
      { ...made, external: { number: "X" } },
      { ...made, events: [{ at: "x", actor: "robot" }] },
    ];
    expect(parseAppeals(JSON.stringify([...broken, made]))).toEqual([made]);
  });
});
