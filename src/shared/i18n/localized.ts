import type { Locale } from "./config";

/** A text that exists in Russian and may exist in Kazakh and English. Russian is the source. */
export type Localized = { ru: string } & Partial<Record<Exclude<Locale, "ru">, string>>;

export function localize(value: Localized, locale: Locale): string {
  const text = value[locale];
  return text !== undefined && text.trim() !== "" ? text : value.ru;
}
