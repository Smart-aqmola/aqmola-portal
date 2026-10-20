"use client";

import { useCallback, useSyncExternalStore } from "react";
import { FAVORITES_KEY, parseFavorites, toggleFavorite } from "../domain/favorites";

const EMPTY: string[] = [];
const listeners = new Set<() => void>();

let lastRaw: string | null | undefined;
let lastList: string[] = EMPTY;
// Used when the browser refuses to store data (for example in a private window).
let memory: string[] | null = null;

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(FAVORITES_KEY);
  } catch {
    return null;
  }
}

/** The list must be the same object until the stored text changes, or React re-renders forever. */
function getSnapshot(): string[] {
  if (memory) return memory;
  const raw = readStorage();
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastList = parseFavorites(raw);
  }
  return lastList;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function save(list: string[]) {
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    memory = null;
  } catch {
    memory = list;
  }
  for (const listener of listeners) listener();
}

/** Saved services of this browser. Empty on the server and during the first render. */
export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback((slug: string) => save(toggleFavorite(getSnapshot(), slug)), []);
  return { favorites, toggle };
}
