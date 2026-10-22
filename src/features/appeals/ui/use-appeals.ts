"use client";

import { createCollection } from "@/shared/lib/collection";
import { MAX_APPEALS, type Appeal } from "../domain/appeal";
import { APPEALS_KEY, parseAppeals } from "../domain/storage";

const appeals = createCollection<Appeal>({
  key: APPEALS_KEY,
  parse: parseAppeals,
  max: MAX_APPEALS,
});

/** The appeals of one person. `everyone` is every appeal, so a new number never repeats. */
export function useAppeals(ownerId: string | null) {
  const mine = appeals.useMine(ownerId);
  return { mine, add: appeals.add, replace: appeals.replace, everyone: appeals.snapshot };
}

/** Every appeal in this browser, for the cabinet of an organization (spec 12.2). */
export function useAllAppeals() {
  return { all: appeals.useAll(), replace: appeals.replace };
}
