import { describe, expect, it } from "vitest";
import { markRead, parseReadState } from "./read-state";

describe("parseReadState", () => {
  it("reads back what was written", () => {
    const state = { "demo-resident": "2026-10-21T06:00:00.000Z" };
    expect(parseReadState(JSON.stringify(state))).toEqual(state);
  });

  it("gives an empty state for nothing, broken text and other shapes", () => {
    expect(parseReadState(null)).toEqual({});
    expect(parseReadState("{")).toEqual({});
    expect(parseReadState("[1]")).toEqual({});
    expect(parseReadState("5")).toEqual({});
  });

  it("drops entries with a bad name or a bad time", () => {
    const raw = JSON.stringify({
      ok: "2026-10-21T06:00:00.000Z",
      "BAD NAME": "2026-10-21T06:00:00.000Z",
      nodate: "yesterday",
      number: 5,
    });
    expect(parseReadState(raw)).toEqual({ ok: "2026-10-21T06:00:00.000Z" });
  });
});

describe("markRead", () => {
  it("sets the moment for the person without touching the others", () => {
    expect(markRead({ b: "2026-01-01T00:00:00.000Z" }, "a", "2026-10-21T06:00:00.000Z")).toEqual({
      a: "2026-10-21T06:00:00.000Z",
      b: "2026-01-01T00:00:00.000Z",
    });
  });

  it("never moves the moment backwards and returns the same state then", () => {
    const state = { a: "2026-10-21T06:00:00.000Z" };
    expect(markRead(state, "a", "2026-10-01T00:00:00.000Z")).toBe(state);
  });
});
