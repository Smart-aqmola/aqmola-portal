export const locales = ["ru", "kk", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ru";

/** English pages still work by address, but the switcher shows only the languages the brief asks for. */
export const switcherLocales: readonly Locale[] = ["ru", "kk"];

export const localeLabels: Record<Locale, { short: string; native: string }> = {
  ru: { short: "РУС", native: "Русский" },
  kk: { short: "ҚАЗ", native: "Қазақша" },
  en: { short: "ENG", native: "English" },
};

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Choose a supported locale from an Accept-Language header value. */
export function pickLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return defaultLocale;

  const candidates = acceptLanguage
    .split(",")
    .map((entry, index) => {
      const [tag, ...params] = entry.trim().split(";");
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="))
        ?.slice(2);
      const q = quality === undefined ? 1 : Number(quality);
      return { primary: tag.trim().toLowerCase().split("-")[0], q, index };
    })
    .filter(
      (candidate) => candidate.primary !== "" && Number.isFinite(candidate.q) && candidate.q > 0,
    )
    .sort((a, b) => b.q - a.q || a.index - b.index);

  for (const { primary } of candidates) {
    if (hasLocale(primary)) return primary;
  }
  return defaultLocale;
}

/** Return the same path under another locale: /ru/services -> /kk/services. */
export function localizePath(pathname: string, locale: Locale): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && hasLocale(segments[0])) segments.shift();
  return `/${[locale, ...segments].join("/")}`;
}
