"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { createLocalStore } from "@/shared/lib/local-store";
import {
  DEFAULT_SETTINGS,
  DISPLAY_KEY,
  parseSettings,
  toAttributes,
  type DisplaySettings,
} from "../domain/settings";

const store = createLocalStore<DisplaySettings>({
  key: DISPLAY_KEY,
  parse: parseSettings,
  empty: DEFAULT_SETTINGS,
});

/** Theme, contrast and text size of this browser. Applies them to <html> whenever they change. */
export function useDisplay() {
  const settings = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  useEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(toAttributes(settings))) {
      if (value === null) root.removeAttribute(name);
      else root.setAttribute(name, value);
    }
  }, [settings]);

  const update = useCallback(
    (patch: Partial<DisplaySettings>) => store.write({ ...store.getSnapshot(), ...patch }),
    [],
  );
  const reset = useCallback(() => store.write(null), []);
  return { settings, update, reset };
}
