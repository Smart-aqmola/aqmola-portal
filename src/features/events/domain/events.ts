import type { EventGenre, EventItem } from "./types";

const DAY = 24 * 60 * 60 * 1000;

/** The calendar day of an event, yyyy-mm-dd. */
export const dayOf = (event: Pick<EventItem, "startsAt">): string => event.startsAt.slice(0, 10);

/** Today in Kazakhstan (UTC+5), yyyy-mm-dd, whatever the time zone of the server. */
export function todayIn(now: Date): string {
  return new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Events that have not ended before today, the nearest first. */
export function upcoming(events: readonly EventItem[], now: Date): EventItem[] {
  const today = todayIn(now);
  return events
    .filter((event) => dayOf(event) >= today)
    .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Saturday and Sunday of this weekend, or of the next one when today is a weekday after it. */
export function weekendDays(now: Date): [string, string] {
  const today = new Date(`${todayIn(now)}T00:00:00Z`);
  const weekday = today.getUTCDay(); // 0 Sunday … 6 Saturday
  const toSaturday = weekday === 0 ? -1 : 6 - weekday;
  const saturday = new Date(today.getTime() + toSaturday * DAY);
  const sunday = new Date(saturday.getTime() + DAY);
  return [saturday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)];
}

export function onWeekend(events: readonly EventItem[], now: Date): EventItem[] {
  const days = weekendDays(now);
  return upcoming(events, now).filter((event) => days.includes(dayOf(event)));
}

export type EventFilter = { genre?: EventGenre; venueId?: string; free?: boolean };

export function filterEvents(events: readonly EventItem[], filter: EventFilter): EventItem[] {
  return events.filter(
    (event) =>
      (!filter.genre || event.genre === filter.genre) &&
      (!filter.venueId || event.venueId === filter.venueId) &&
      (!filter.free || event.price === null),
  );
}

/** Other events of the same genre first, then any others; never the event itself. */
export function relatedEvents(events: readonly EventItem[], event: EventItem, count: number) {
  const others = events.filter((item) => item.id !== event.id);
  return [
    ...others.filter((item) => item.genre === event.genre),
    ...others.filter((item) => item.genre !== event.genre),
  ].slice(0, count);
}

const icsText = (value: string) =>
  value.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r\n|\r|\n/g, "\\n");
const icsStamp = (iso: string) => iso.replace(/[-:]/g, "").slice(0, 15);

/** A calendar file (RFC 5545) for "Add to calendar": the time is given in Kazakhstan time. */
export function toIcs(
  event: Pick<EventItem, "id" | "startsAt" | "durationMinutes">,
  text: { title: string; place: string; description: string },
  now: Date,
): string {
  const start = new Date(`${event.startsAt}:00+05:00`);
  const end = new Date(start.getTime() + event.durationMinutes * 60 * 1000);
  const utc = (date: Date) => `${icsStamp(date.toISOString())}Z`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aqmola demo portal//RU",
    "BEGIN:VEVENT",
    `UID:${event.id}@aqmola.test`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${icsText(text.title)}`,
    `LOCATION:${icsText(text.place)}`,
    `DESCRIPTION:${icsText(text.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
