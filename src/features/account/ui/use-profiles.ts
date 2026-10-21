"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createLocalStore } from "@/shared/lib/local-store";
import type { Profile } from "../domain/profile";
import { MAX_PROFILES, PROFILES_KEY, parseProfiles } from "../domain/storage";

const EMPTY: Profile[] = [];
const store = createLocalStore<Profile[]>({
  key: PROFILES_KEY,
  parse: parseProfiles,
  empty: EMPTY,
});

/** People who registered in this browser. With a server this becomes a call to the backend. */
export function useProfiles() {
  const profiles = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const add = useCallback((profile: Profile) => {
    store.write([profile, ...store.getSnapshot()].slice(0, MAX_PROFILES));
  }, []);

  return { profiles, add };
}
