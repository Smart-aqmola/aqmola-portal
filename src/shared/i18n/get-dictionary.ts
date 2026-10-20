import type ru from "./dictionaries/ru.json";
import type { Locale } from "./config";

export type Dictionary = typeof ru;

// Typing the loaders as Dictionary makes TypeScript fail the build when kk/en miss a key.
const loaders: Record<Locale, () => Promise<Dictionary>> = {
  ru: () => import("./dictionaries/ru.json").then((module) => module.default),
  kk: () => import("./dictionaries/kk.json").then((module) => module.default),
  en: () => import("./dictionaries/en.json").then((module) => module.default),
};

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]();
}
