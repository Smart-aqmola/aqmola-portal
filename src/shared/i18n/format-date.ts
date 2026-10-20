import type { Locale } from "./config";

/** "2026-10-18" -> "18 октября". Uses UTC so the day never shifts with the visitor's time zone. */
export function formatDate(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}
