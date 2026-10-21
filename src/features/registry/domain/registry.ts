/** Where a line of the registry comes from; each source has its own page with the full story. */
export const registryKinds = ["service", "contract", "meter", "appeal"] as const;
export type RegistryKind = (typeof registryKinds)[number];

/**
 * One line of "My requests" (spec 10.3). The texts are already in the visitor's language, because
 * each source names its statuses in its own words; what is common is kept in the plain fields.
 */
export type RegistryItem = {
  id: string;
  kind: RegistryKind;
  /** Registration number; a draft has none. */
  number?: string;
  /** ISO date and time of submission; for a draft, of the last change. */
  at: string;
  /** Kind of service or of request, written for the person. */
  title: string;
  address: string;
  organization: string;
  description: string;
  status: string;
  /** Only to pick a colour; the status is always written out. */
  tone: "new" | "work" | "done" | "problem";
  /** Done with: it belongs to the archive (spec 10.7). */
  closed: boolean;
  /** The person must do something: correct the documents, answer a question (spec 10.5). */
  needsAction: boolean;
  actionLabel?: string;
  actionHref?: string;
  assignee?: string;
  /** The organization's comment, why it was returned or refused. */
  remarks?: string;
  /** What came of it (spec 10.6). */
  result?: string;
  /** How many documents are attached; the documents themselves are on the page of the request. */
  filesCount: number;
  href: string;
};

/**
 * Days the organization has to deal with a request, by regulation (spec 10.3). These are demo
 * values; real ones come from the regulations of each organization.
 */
export const REGULATION_DAYS: Record<RegistryKind, number> = {
  service: 5,
  contract: 10,
  meter: 7,
  appeal: 15,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** The day by which the request should be dealt with: `YYYY-MM-DD`. */
export function dueDate(item: Pick<RegistryItem, "kind" | "at">): string {
  return new Date(Date.parse(item.at) + REGULATION_DAYS[item.kind] * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** An open request is late when its day has passed. */
export function isOverdue(item: Pick<RegistryItem, "kind" | "at" | "closed">, now: Date): boolean {
  return !item.closed && dueDate(item) < now.toISOString().slice(0, 10);
}

export const registryStates = ["open", "action", "archive"] as const;
export type RegistryState = (typeof registryStates)[number];

export type RegistryFilter = {
  kind: RegistryKind | "";
  state: RegistryState | "";
  /** Part of a number or an address; letters in any case, the ё like the е. */
  query: string;
};

const fold = (text: string) => text.toLowerCase().replaceAll("ё", "е").trim();

/** The requests that fit the filter, the newest first. */
export function filterItems(
  items: readonly RegistryItem[],
  filter: RegistryFilter,
): RegistryItem[] {
  const query = fold(filter.query);
  return items
    .filter((item) => !filter.kind || item.kind === filter.kind)
    .filter((item) => {
      if (filter.state === "open") return !item.closed;
      if (filter.state === "action") return item.needsAction;
      if (filter.state === "archive") return item.closed;
      return true;
    })
    .filter(
      (item) =>
        !query ||
        fold(item.number ?? "").includes(query) ||
        fold(item.address).includes(query) ||
        fold(item.title).includes(query),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** How many requests are in each state, for the labels of the filter. */
export function countStates(items: readonly RegistryItem[]): Record<RegistryState, number> {
  return {
    open: items.filter((item) => !item.closed).length,
    action: items.filter((item) => item.needsAction).length,
    archive: items.filter((item) => item.closed).length,
  };
}
