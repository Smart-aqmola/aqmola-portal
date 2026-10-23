import type { EventItem, Venue } from "./types";

/** The poster of events. Test data now, an API later; `now` fixes the dates of the stub. */
export interface EventRepository {
  listEvents(now: Date): Promise<EventItem[]>;
  getEvent(slug: string, now: Date): Promise<EventItem | null>;
  listVenues(): Promise<Venue[]>;
}
