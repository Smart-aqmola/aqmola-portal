"use client";

import { useMemo, useSyncExternalStore } from "react";
import { createLocalStore } from "./local-store";

type Options<T> = {
  key: string;
  parse: (raw: string | null) => T[];
  /** The oldest records are dropped beyond this many. */
  max: number;
  /** What tells two versions of one record apart from other records. */
  idOf?: (item: T) => string;
};

/**
 * A list of records kept in the browser: the meters, payments, appeals and so on. Every list is
 * read and written the same way, so the features only say where it lives and how to read it.
 * With a server these functions become calls to the backend.
 */
export function createCollection<T>({ key, parse, max, idOf = byId }: Options<T>) {
  const none: T[] = [];
  const store = createLocalStore<T[]>({ key, parse, empty: none });
  const snapshot = store.getSnapshot;

  /** Puts a new record first. */
  function add(item: T) {
    store.write([item, ...snapshot()].slice(0, max));
  }

  /** Puts several new records first, the first of them on top. */
  function addMany(items: readonly T[]) {
    store.write([...items, ...snapshot()].slice(0, max));
  }

  /** Swaps a record for its changed copy. */
  function replace(changed: T) {
    const id = idOf(changed);
    store.write(snapshot().map((item) => (idOf(item) === id ? changed : item)));
  }

  /** Swaps changed records and adds new ones in one write. */
  function save({ updated, created }: { updated: readonly T[]; created: readonly T[] }) {
    const changed = new Map(updated.map((item) => [idOf(item), item]));
    const next = snapshot().map((item) => changed.get(idOf(item)) ?? item);
    store.write([...created, ...next].slice(0, max));
  }

  /** Every record in this browser. */
  function useAll(): T[] {
    return useSyncExternalStore(store.subscribe, snapshot, store.getServerSnapshot);
  }

  /** The records of one person; nothing when nobody is signed in. */
  function useMine(ownerId: string | null): T[] {
    const all = useAll();
    return useMemo(
      () => (ownerId ? all.filter((item) => ownerOf(item) === ownerId) : none),
      [all, ownerId],
    );
  }

  return { add, addMany, replace, save, snapshot, useAll, useMine };
}

function byId(item: unknown): string {
  return (item as { id: string }).id;
}

function ownerOf(item: unknown): string | undefined {
  return (item as { ownerId?: string }).ownerId;
}
