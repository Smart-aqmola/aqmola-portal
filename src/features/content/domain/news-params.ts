import type { Locale } from "@/shared/i18n/config";
import { newsTopics, type NewsTopic } from "./types";

export const MAX_NEWS_QUERY = 100;
export type NewsTab = "latest" | "popular";

/** What the news page reads from the address: ?q=…&topic=…&tab=…&page=… */
export type NewsParams = { q: string; topic?: NewsTopic; tab: NewsTab; page: number };

type Raw = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Unknown or broken values are dropped instead of failing the page. */
export function parseNewsParams(raw: Raw): NewsParams {
  const q = (first(raw.q) ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NEWS_QUERY);
  const topic = newsTopics.find((item) => item === first(raw.topic));
  const page = Number.parseInt(first(raw.page) ?? "", 10);
  return {
    q,
    ...(topic ? { topic } : {}),
    tab: first(raw.tab) === "popular" ? "popular" : "latest",
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function newsHref(lang: Locale, params: NewsParams): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.topic) search.set("topic", params.topic);
  if (params.tab !== "latest") search.set("tab", params.tab);
  if (params.page > 1) search.set("page", String(params.page));
  const text = search.toString();
  return `/${lang}/news${text ? `?${text}` : ""}`;
}
