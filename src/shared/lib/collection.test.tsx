import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createCollection } from "./collection";

type Note = { id: string; ownerId: string; text: string };
const parse = (raw: string | null): Note[] => (raw ? (JSON.parse(raw) as Note[]) : []);
const note = (id: string, ownerId = "a", text = id): Note => ({ id, ownerId, text });

describe("createCollection", () => {
  it("adds new records first and drops the oldest beyond the limit", () => {
    const notes = createCollection({ key: "c1", parse, max: 2 });
    notes.add(note("1"));
    notes.add(note("2"));
    notes.add(note("3"));
    expect(notes.snapshot().map((item) => item.id)).toEqual(["3", "2"]);
  });

  it("replaces a record by its id and saves changes and new records in one go", () => {
    const notes = createCollection({ key: "c2", parse, max: 10 });
    notes.addMany([note("1"), note("2")]);
    notes.replace(note("2", "a", "changed"));
    notes.save({ updated: [note("1", "a", "edited")], created: [note("3")] });
    expect(notes.snapshot().map((item) => `${item.id}:${item.text}`)).toEqual([
      "3:3",
      "1:edited",
      "2:changed",
    ]);
  });

  it("can tell records apart by another field", () => {
    const numbered = createCollection({
      key: "c3",
      parse,
      max: 10,
      idOf: (item: Note) => item.text,
    });
    numbered.add({ id: "x", ownerId: "a", text: "N-1" });
    numbered.replace({ id: "y", ownerId: "a", text: "N-1" });
    expect(numbered.snapshot()).toEqual([{ id: "y", ownerId: "a", text: "N-1" }]);
  });

  it("gives one person only their records and follows changes", () => {
    const notes = createCollection({ key: "c4", parse, max: 10 });
    const { result } = renderHook(() => ({ mine: notes.useMine("a"), none: notes.useMine(null) }));
    act(() => notes.addMany([note("1", "a"), note("2", "b")]));
    expect(result.current.mine.map((item) => item.id)).toEqual(["1"]);
    expect(result.current.none).toEqual([]);
  });
});
