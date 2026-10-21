export const READ_KEY = "aqmola:notifications-read";

/** For each person, the moment up to which everything was marked as read. */
export type ReadState = Record<string, string>;

const ID = /^[a-z0-9-]{1,60}$/;
const MAX_PEOPLE = 50;

/** Reads the saved state defensively: anything unexpected in storage is dropped. */
export function parseReadState(raw: string | null): ReadState {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    const entries = Object.entries(value).filter(
      (entry): entry is [string, string] =>
        ID.test(entry[0]) &&
        typeof entry[1] === "string" &&
        entry[1].length <= 40 &&
        !Number.isNaN(Date.parse(entry[1])),
    );
    return Object.fromEntries(entries.slice(0, MAX_PEOPLE));
  } catch {
    return {};
  }
}

/** The state after the person marked everything as read at `at`; never moves backwards. */
export function markRead(state: ReadState, ownerId: string, at: string): ReadState {
  const before = state[ownerId];
  if (before && before >= at) return state;
  return { ...state, [ownerId]: at };
}
