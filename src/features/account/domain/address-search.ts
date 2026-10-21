import { matchesQuery } from "@/features/catalog/domain/search";
import type { Sector } from "@/features/catalog/domain/types";

/** One address from the directory, already named in the visitor's language. */
export type AddressSuggestion = {
  id: string;
  territoryId: string;
  locality: string;
  street: string;
  /** What the person reads in the list: "Аккольский район, Новорыбинка, улица Школьная". */
  label: string;
  /** Networks this place does not have (see `AddressEntry.without`). */
  without: readonly Sector[];
};

export const MAX_SUGGESTIONS = 8;

/** Suggestions for what the person has typed: every word must appear in the label (spec 3.2). */
export function filterAddresses(
  suggestions: readonly AddressSuggestion[],
  query: string,
  limit: number = MAX_SUGGESTIONS,
): AddressSuggestion[] {
  if (!query.trim()) return [];
  return suggestions.filter((item) => matchesQuery(item.label, query)).slice(0, limit);
}
