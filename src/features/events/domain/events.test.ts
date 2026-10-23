import { describe, expect, it } from "vitest";
import {
  filterEvents,
  onWeekend,
  relatedEvents,
  toIcs,
  todayIn,
  upcoming,
  weekendDays,
} from "./events";
import type { EventItem } from "./types";

const event = (id: string, startsAt: string, patch: Partial<EventItem> = {}): EventItem => ({
  id,
  slug: id,
  genre: "concerts",
  title: { ru: id },
  summary: { ru: "" },
  description: { ru: "" },
  venueId: "v-1",
  startsAt,
  durationMinutes: 90,
  age: "0+",
  price: 1000,
  popular: false,
  ...patch,
});

// Thursday 22 October 2026, 23:30 in Kazakhstan: still the 22nd there, already the 22nd in UTC.
const thursday = new Date("2026-10-22T18:30:00Z");

describe("dates of the poster", () => {
  it("counts the day in Kazakhstan time", () => {
    expect(todayIn(new Date("2026-10-22T20:00:00Z"))).toBe("2026-10-23");
  });

  it("finds the coming weekend, and today's when it is Saturday or Sunday", () => {
    expect(weekendDays(thursday)).toEqual(["2026-10-24", "2026-10-25"]);
    expect(weekendDays(new Date("2026-10-25T06:00:00Z"))).toEqual(["2026-10-24", "2026-10-25"]);
  });

  it("drops past events, sorts the rest and picks the weekend ones", () => {
    const events = [
      event("sat", "2026-10-24T19:00"),
      event("past", "2026-10-20T19:00"),
      event("today", "2026-10-22T10:00"),
      event("later", "2026-11-02T19:00"),
    ];
    expect(upcoming(events, thursday).map((item) => item.id)).toEqual(["today", "sat", "later"]);
    expect(onWeekend(events, thursday).map((item) => item.id)).toEqual(["sat"]);
  });
});

describe("filters", () => {
  it("filters by genre, venue and free entry, and suggests the same genre first", () => {
    const events = [
      event("a", "2026-10-24T19:00", { genre: "theatre" }),
      event("b", "2026-10-25T19:00", { price: null, venueId: "v-2" }),
      event("c", "2026-10-26T19:00"),
    ];
    expect(filterEvents(events, { genre: "theatre" }).map((item) => item.id)).toEqual(["a"]);
    expect(filterEvents(events, { free: true }).map((item) => item.id)).toEqual(["b"]);
    expect(filterEvents(events, { venueId: "v-2" }).map((item) => item.id)).toEqual(["b"]);
    expect(relatedEvents(events, events[2], 2).map((item) => item.id)).toEqual(["b", "a"]);
  });
});

describe("toIcs", () => {
  it("writes the time in UTC and escapes the text", () => {
    const text = toIcs(
      event("e-1", "2026-10-24T19:00"),
      { title: "Концерт; вечер", place: "Парк, Кокшетау", description: "Строка" },
      thursday,
    );
    expect(text).toContain("DTSTART:20261024T140000Z");
    expect(text).toContain("DTEND:20261024T153000Z");
    expect(text).toContain("SUMMARY:Концерт\\; вечер");
    expect(text).toContain("LOCATION:Парк\\, Кокшетау");
    expect(text.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});
