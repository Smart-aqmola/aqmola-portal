"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createLocalStore } from "@/shared/lib/local-store";
import { useHydrated } from "@/shared/lib/use-hydrated";
import { SESSION_KEY, parseSession, type DemoSession } from "../domain/storage";

const store = createLocalStore<DemoSession | null>({
  key: SESSION_KEY,
  parse: parseSession,
  empty: null,
});

/** The demo "sign in": picking a fictional profile. Nothing is checked, nothing leaves the browser. */
export function useSession() {
  const session = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const ready = useHydrated();
  const signIn = useCallback((profile: DemoSession) => store.write(profile), []);
  const signOut = useCallback(() => store.write(null), []);
  return { session, ready, signIn, signOut };
}
