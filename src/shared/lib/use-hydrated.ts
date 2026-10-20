"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False on the server and during hydration, true afterwards: browser-only data is safe to show then. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
