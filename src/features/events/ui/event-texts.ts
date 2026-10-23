import type { Locale } from "@/shared/i18n/config";
import type { EventGenre } from "../domain/types";
import type { IconName } from "@/shared/ui/icon/icon";

export const genreIcons: Record<EventGenre, IconName> = {
  concerts: "music",
  theatre: "mask",
  exhibitions: "frame",
  kids: "balloon",
  sport: "ball",
  festivals: "star",
  masterclasses: "brush",
};

/**
 * "сб, 24 октября, 19:00". The start is written in Kazakhstan time, so it is read as UTC and never
 * moves with the visitor's own time zone.
 */
export function eventWhen(startsAt: string, lang: Locale): string {
  const date = new Date(`${startsAt}:00Z`);
  const day = new Intl.DateTimeFormat(lang, {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
  return `${day}, ${startsAt.slice(11, 16)}`;
}
