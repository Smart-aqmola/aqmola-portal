import type { EventRepository } from "../domain/repository";
import { todayIn } from "../domain/events";
import type { EventItem } from "../domain/types";
import { eventSeeds, venues, type EventSeed } from "./events";

const DAY = 24 * 60 * 60 * 1000;

/** The Monday of the week of `now`, in Kazakhstan time. */
function mondayOf(now: Date): Date {
  const today = new Date(`${todayIn(now)}T00:00:00Z`);
  const weekday = (today.getUTCDay() + 6) % 7; // 0 Monday … 6 Sunday
  return new Date(today.getTime() - weekday * DAY);
}

function toEvent(seed: EventSeed, monday: Date): EventItem {
  const { dayOffset, time, ...rest } = seed;
  const day = new Date(monday.getTime() + dayOffset * DAY).toISOString().slice(0, 10);
  return { ...rest, startsAt: `${day}T${time}` };
}

/** Serves the poster from local test data, its dates moved to the current week. */
export class StubEventRepository implements EventRepository {
  async listEvents(now: Date) {
    const monday = mondayOf(now);
    return eventSeeds.map((seed) => toEvent(seed, monday));
  }

  async getEvent(slug: string, now: Date) {
    const seed = eventSeeds.find((item) => item.slug === slug);
    return seed ? toEvent(seed, mondayOf(now)) : null;
  }

  async listVenues() {
    return [...venues];
  }
}
